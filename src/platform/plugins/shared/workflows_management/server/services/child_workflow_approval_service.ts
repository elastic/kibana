/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { createHash } from 'node:crypto';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import {
  visitNestedSteps,
  WorkflowExecuteStepInputSchema,
  WorkflowsManagementApiActions,
} from '@kbn/workflows';
import type { ChildWorkflowApproval, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowAccessControlService } from './workflow_access_control';
import type { WorkflowCrudService } from './workflow_crud_service';
import { ensureWorkflowServiceAccountMutationAuthorized } from './workflow_service_account_binding';
import type { ChildWorkflowApprovalReview } from '../../common/child_workflow_approvals';
import { assertCanReadManagedWorkflow } from '../api/routes/utils/route_security';
import { workflowIndexName } from '../storage/workflow_storage';
import type { WorkflowProperties } from '../storage/workflow_storage';

const fingerprint = (value: string): string => createHash('sha256').update(value).digest('hex');
const delegationSchema = WorkflowExecuteStepInputSchema.pick({
  'workflow-id': true,
  inheritRunAs: true,
  runAsMode: true,
});
const MAX_APPROVED_CHILDREN = 50;
const MAX_APPROVAL_BYTES = 5 * 1024 * 1024;

export class ChildWorkflowApprovalService {
  constructor(
    private readonly core: CoreStart,
    private readonly crud: Pick<WorkflowCrudService, 'indexWorkflowDocument'>,
    private readonly access: Pick<WorkflowAccessControlService, 'assertAccess' | 'permissions'>
  ) {}

  private async load(id: string, spaceId: string, request: KibanaRequest) {
    try {
      const document = await this.core.elasticsearch.client.asInternalUser.get<WorkflowProperties>({
        index: workflowIndexName,
        id,
      });
      const source = document._source;
      if (!source || source.spaceId !== spaceId || source.deleted_at) {
        throw Boom.notFound('Child approval requires existing workflows in the same space.');
      }
      await this.access.assertAccess(source, 'read', request);
      await this.access.assertAccess(source, 'execute', request);
      assertCanReadManagedWorkflow(request, source);
      return { source, seqNo: document._seq_no, primaryTerm: document._primary_term };
    } catch (error) {
      if (isNotFoundError(error)) throw Boom.notFound('Workflow not found.');
      throw error;
    }
  }

  private async collect(id: string, spaceId: string, request: KibanaRequest) {
    if (!this.core.security.serviceAccounts.isEnabled()) {
      throw Boom.forbidden('Service account execution is disabled.');
    }
    const root = await this.load(id, spaceId, request);
    const accountId = root.source.definition?.settings?.run_as;
    if (!accountId || !root.source.definition) {
      throw Boom.badRequest('Save a parent service account before reviewing child approvals.');
    }
    const snapshots: ChildWorkflowApproval[] = [];
    let bytes = 0;
    const visit = async (definition: WorkflowYaml, path: string[], ancestors: string[]) => {
      const calls: Array<{ name: string; workflowId: string; mode: 'inherit' | 'override' }> = [];
      visitNestedSteps(definition.steps, ({ step }) => {
        if (step.type !== 'workflow.execute' && step.type !== 'workflow.executeAsync') return;
        const input = delegationSchema.parse(step.with);
        if (input.runAsMode !== undefined && input.inheritRunAs !== undefined) {
          throw Boom.badRequest('Use either runAsMode or inheritRunAs, not both.');
        }
        const mode = input.runAsMode ?? (input.inheritRunAs ? 'inherit' : 'default');
        if (mode === 'default') return;
        if (input['workflow-id'].includes('{{')) {
          throw Boom.badRequest('Inherited child workflows require a literal workflow-id.');
        }
        calls.push({ name: step.name, workflowId: input['workflow-id'], mode });
      });
      for (const call of calls) {
        if (
          ancestors.includes(call.workflowId) ||
          path.length >= 10 ||
          snapshots.length >= MAX_APPROVED_CHILDREN
        ) {
          throw Boom.badRequest(
            'Child approval exceeds the nesting limit, contains a cycle, or has more than 50 calls.'
          );
        }
        const { source } = await this.load(call.workflowId, spaceId, request);
        if (!source.valid || !source.enabled || !source.definition) {
          throw Boom.badRequest('Only valid, enabled child workflows can be approved.');
        }
        if (call.mode === 'inherit' && source.definition.settings?.run_as) {
          throw Boom.badRequest('Use runAsMode: override to replace the child service account.');
        }
        bytes += Buffer.byteLength(source.yaml);
        if (bytes > MAX_APPROVAL_BYTES)
          throw Boom.badRequest('Child approval snapshots exceed 5 MB.');
        const childPath = [...path, call.name];
        snapshots.push({
          path: childPath,
          workflowId: call.workflowId,
          runAsMode: call.mode,
          yaml: source.yaml,
          definition: source.definition,
          version: source.version,
          createdAt: source.created_at,
        });
        await visit(source.definition, childPath, [...ancestors, call.workflowId]);
      }
    };
    await visit(root.source.definition, [], [id]);
    const reviewToken = fingerprint(
      JSON.stringify({
        id,
        spaceId,
        accountId,
        seqNo: root.seqNo,
        primaryTerm: root.primaryTerm,
        snapshots,
      })
    );
    return { root, accountId, snapshots, reviewToken };
  }

  async review(
    id: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ChildWorkflowApprovalReview> {
    const { root, accountId, snapshots, reviewToken } = await this.collect(id, spaceId, request);
    const approved = root.source.childWorkflowApprovals;
    const privileges = await this.core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({ cluster: ['manage_security'] });
    const permissions = await this.access.permissions(root.source, request);
    return {
      reviewToken,
      serviceAccountId: accountId,
      canApprove:
        privileges.has_all_requested &&
        permissions.edit &&
        !root.source.managed &&
        request.authzResult?.[WorkflowsManagementApiActions.update] === true,
      children: snapshots.map((snapshot) => {
        const previous =
          approved?.serviceAccountId === accountId
            ? approved.snapshots.find(
                (entry) =>
                  JSON.stringify(entry.path) === JSON.stringify(snapshot.path) &&
                  entry.workflowId === snapshot.workflowId &&
                  entry.runAsMode === snapshot.runAsMode &&
                  entry.createdAt === snapshot.createdAt
              )
            : undefined;
        return {
          path: snapshot.path,
          workflowId: snapshot.workflowId,
          name: snapshot.definition.name,
          currentVersion: snapshot.version,
          approvedVersion: previous?.version,
          currentYaml: snapshot.yaml,
          approvedYaml: previous?.yaml,
          status: !previous
            ? 'unapproved'
            : previous.yaml === snapshot.yaml
            ? 'approved'
            : 'changed',
        };
      }),
    };
  }

  async approve(
    id: string,
    spaceId: string,
    request: KibanaRequest,
    reviewToken: string
  ): Promise<void> {
    await ensureWorkflowServiceAccountMutationAuthorized(this.core, request);
    const {
      root,
      accountId,
      snapshots,
      reviewToken: currentToken,
    } = await this.collect(id, spaceId, request);
    await this.access.assertAccess(root.source, 'edit', request);
    if (root.source.managed)
      throw Boom.badRequest(
        'Managed workflow approvals must be configured by their owning plugin.'
      );
    if (reviewToken !== currentToken) {
      throw Boom.conflict(
        'A workflow changed during review. Review the changes again before approving.'
      );
    }
    if (root.seqNo == null || root.primaryTerm == null)
      throw Boom.conflict('Workflow revision is unavailable.');
    const approvedAt = new Date().toISOString();
    const approvedBy = this.core.security.authc.getCurrentUser(request)?.username;
    if (!approvedBy) throw Boom.forbidden('An authenticated approver is required.');
    await this.crud.indexWorkflowDocument(
      id,
      { ...root.source, updated_at: approvedAt, lastUpdatedBy: approvedBy },
      {
        request,
        previousDocument: root.source,
        ifSeqNo: root.seqNo,
        ifPrimaryTerm: root.primaryTerm,
        childApproval: { serviceAccountId: accountId, approvedAt, approvedBy, snapshots },
      }
    );
  }
}
