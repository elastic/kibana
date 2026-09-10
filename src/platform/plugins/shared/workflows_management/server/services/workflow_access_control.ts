/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import {
  buildEntityReadAccessQuery,
  InvalidAccessControlError,
  prepareAccessControl,
} from '@kbn/entity-access-control';
import type { AccessControlInput } from '@kbn/entity-access-control';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import {
  getWorkflowPermissions,
  WORKFLOW_ACCESS_CONTROL_ROLES,
  workflowAccessControlSchema,
  WorkflowsManagementApiActions,
} from '@kbn/workflows';
import type {
  WorkflowAccessControl,
  WorkflowAccessControlRole,
  WorkflowAccessOperation,
  WorkflowAccessSubject,
  WorkflowPermissions,
} from '@kbn/workflows';
import { WorkflowAccessDeniedError } from './workflow_access_denied_error';
import type { WorkflowCrudService } from './workflow_crud_service';
import { isIndexNotFoundError } from '../api/lib/es_error_helpers';
import { workflowIndexName } from '../storage/workflow_storage';

const rolePrivileges = {
  viewer: [WorkflowsManagementApiActions.read],
  executor: [WorkflowsManagementApiActions.read, WorkflowsManagementApiActions.execute],
  editor: [
    WorkflowsManagementApiActions.read,
    WorkflowsManagementApiActions.execute,
    WorkflowsManagementApiActions.update,
  ],
} as const;

export const assertWorkflowOperation = (
  workflow: WorkflowAccessSubject,
  operation: WorkflowAccessOperation,
  profileId: string | undefined
): void => {
  if (
    operation !== 'manage' &&
    (!workflow.access_control || workflow.access_control.access_mode === 'public')
  )
    return;
  if (!getWorkflowPermissions(workflow, profileId)[operation])
    throw new WorkflowAccessDeniedError();
};

export class WorkflowAccessControlService {
  constructor(
    private readonly core: CoreStart,
    private readonly crud: Pick<WorkflowCrudService, 'readModifyWriteWorkflowDocument'>,
    private readonly authz?: SecurityPluginStart['authz']
  ) {}

  async getProfileId(request: KibanaRequest): Promise<string | undefined> {
    return (await this.core.userProfile.getCurrentProfileId({ request })) ?? undefined;
  }

  async permissions(
    workflow: WorkflowAccessSubject & { createdBy?: string },
    request?: KibanaRequest
  ): Promise<WorkflowPermissions> {
    const profileId = request ? await this.getProfileId(request) : undefined;
    const permissions = getWorkflowPermissions(workflow, profileId);
    if (!workflow.owner_id && !workflow.access_control && request && profileId) {
      permissions.manage =
        this.core.security.authc.getCurrentUser(request)?.username === workflow.createdBy;
    }
    return permissions;
  }

  async assertAccess(
    workflow: WorkflowAccessSubject,
    operation: WorkflowAccessOperation,
    request?: KibanaRequest
  ): Promise<void> {
    if (operation !== 'manage' && workflow.access_control?.access_mode === 'public') return;
    if (!(await this.permissions(workflow, request))[operation]) {
      throw new WorkflowAccessDeniedError();
    }
  }

  async readFilter(request?: KibanaRequest) {
    return buildEntityReadAccessQuery({
      profileId: request ? await this.getProfileId(request) : undefined,
      ownerField: 'owner_id',
      accessControlField: 'access_control',
      includeMissing: true,
    });
  }

  async executionFilter(
    spaceId: string,
    request?: KibanaRequest
  ): Promise<estypes.QueryDslQueryContainer> {
    const readFilter = await this.readFilter(request);
    const client = this.core.elasticsearch.client.asInternalUser;
    let pitId: string;
    try {
      const snapshot = await client.openPointInTime({
        index: `${workflowIndexName}-*`,
        keep_alive: '1m',
        ignore_unavailable: true,
      });
      pitId = snapshot.id;
    } catch (error) {
      if (isIndexNotFoundError(error)) return { match_all: {} };
      throw error;
    }
    const hiddenIds: string[] = [];
    let searchAfter: estypes.SortResults | undefined;
    try {
      while (true) {
        const response = await client.search({
          pit: { id: pitId, keep_alive: '1m' },
          size: 1000,
          _source: false,
          sort: ['_shard_doc'],
          ...(searchAfter ? { search_after: searchAfter } : {}),
          query: { bool: { filter: [{ term: { spaceId } }], must_not: [readFilter] } },
        });
        if (response.pit_id) pitId = response.pit_id;
        for (const { _id: id } of response.hits.hits) {
          if (id) hiddenIds.push(id);
        }
        if (response.hits.hits.length < 1000) break;
        searchAfter = response.hits.hits.at(-1)?.sort;
        if (!searchAfter) throw new Error('Missing execution access filter cursor.');
      }
    } finally {
      await client.closePointInTime({ id: pitId });
    }
    const excluded: estypes.QueryDslQueryContainer[] = [];
    for (let offset = 0; offset < hiddenIds.length; offset += 10000) {
      excluded.push({ terms: { workflowId: hiddenIds.slice(offset, offset + 10000) } });
    }
    return excluded.length ? { bool: { must_not: excluded } } : { match_all: {} };
  }

  async update(
    id: string,
    spaceId: string,
    input: AccessControlInput<WorkflowAccessControlRole>,
    request: KibanaRequest
  ): Promise<WorkflowAccessControl> {
    const profileId = await this.getProfileId(request);
    if (!profileId) throw new WorkflowAccessDeniedError();
    const { access_mode, entries } = workflowAccessControlSchema.parse(input);
    const { authz } = this;
    if (access_mode === 'private') {
      for (const role of WORKFLOW_ACCESS_CONTROL_ROLES) {
        const uids = new Set(
          entries
            .filter((entry) => entry.role === role && entry.id !== profileId)
            .map(({ id: uid }) => uid)
        );
        if (uids.size > 0) {
          const result = authz
            ? await authz.checkUserProfilesPrivileges(uids).atSpace(spaceId, {
                kibana: rolePrivileges[role].map((privilege) => authz.actions.api.get(privilege)),
              })
            : undefined;
          if (!result || [...uids].some((uid) => !result.hasPrivilegeUids.includes(uid))) {
            throw new InvalidAccessControlError(
              `Selected users must have the Workflows privileges required for ${role} access in this space.`
            );
          }
        }
      }
    }
    const document = await this.crud.readModifyWriteWorkflowDocument(id, spaceId, {
      mutate: (existing) => {
        const legacyOwner =
          !existing.owner_id &&
          !existing.access_control &&
          this.core.security.authc.getCurrentUser(request)?.username === existing.createdBy;
        if (existing.managed || (!legacyOwner && existing.owner_id !== profileId)) {
          throw new WorkflowAccessDeniedError();
        }
        const accessControl = prepareAccessControl({
          input,
          roles: WORKFLOW_ACCESS_CONTROL_ROLES,
          ownerId: profileId,
          previous: existing.access_control,
        });
        return {
          ...existing,
          owner_id: profileId,
          access_control: accessControl,
          updated_at: new Date().toISOString(),
          lastUpdatedBy:
            this.core.security.authc.getCurrentUser(request)?.username ?? existing.lastUpdatedBy,
        };
      },
    });
    if (!document.access_control) throw new Error('Access control was not saved.');
    return document.access_control;
  }
}
