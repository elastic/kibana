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
  pickWorkflowDocumentVersion,
  storedWorkflowAccessControlSchema,
  WORKFLOW_ACCESS_CONTROL_ROLES,
  WorkflowsManagementApiActions,
} from '@kbn/workflows';
import type {
  WorkflowAccessControlRole,
  WorkflowAccessControlUpdateResponseDto,
  WorkflowAccessOperation,
  WorkflowAccessSubject,
  WorkflowPermissions,
} from '@kbn/workflows';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { WorkflowAccessDeniedError } from './workflow_access_denied_error';
import type { WorkflowCrudService } from './workflow_crud_service';
import { isIndexNotFoundError } from '../api/lib/es_error_helpers';
import { applyWorkflowVersion } from '../lib/workflow_version';
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
  if (!getWorkflowPermissions(workflow, profileId)[operation])
    throw new WorkflowAccessDeniedError();
};

export class WorkflowAccessControlService {
  private readonly profileIds = new WeakMap<KibanaRequest, Promise<string | undefined>>();
  private readonly executionFilters = new WeakMap<
    KibanaRequest,
    Map<string, Promise<estypes.QueryDslQueryContainer>>
  >();

  constructor(
    private readonly core: CoreStart,
    private readonly crud: Pick<
      WorkflowCrudService,
      'getWorkflowDocumentWithVersion' | 'writeWorkflowDocumentWithOcc'
    >,
    private readonly authz?: SecurityPluginStart['authz']
  ) {}

  async getProfileId(request: KibanaRequest): Promise<string | undefined> {
    let profileId = this.profileIds.get(request);
    if (!profileId) {
      profileId = this.core.userProfile
        .getCurrentProfileId({ request })
        .then((id) => id ?? undefined);
      this.profileIds.set(request, profileId);
    }
    return profileId;
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

  async toDto<T extends WorkflowAccessSubject & { createdBy?: string }>(
    workflow: T,
    request?: KibanaRequest
  ): Promise<T & { permissions: WorkflowPermissions }> {
    const permissions = await this.permissions(workflow, request);
    const result = { ...workflow, permissions };
    if (!permissions.manage) {
      delete result.owner_id;
      delete result.access_control;
    }
    return result;
  }

  async assertAccess(
    workflow: WorkflowAccessSubject,
    operation: WorkflowAccessOperation,
    request?: KibanaRequest
  ): Promise<void> {
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

  /** Applies workflow ACLs to Kibana execution queries, not direct Elasticsearch reads. */
  async executionFilter(
    spaceId: string,
    request?: KibanaRequest
  ): Promise<estypes.QueryDslQueryContainer> {
    if (!request) return this.buildExecutionFilter(spaceId);
    let filters = this.executionFilters.get(request);
    if (!filters) {
      filters = new Map();
      this.executionFilters.set(request, filters);
    }
    let filter = filters.get(spaceId);
    if (!filter) {
      filter = this.buildExecutionFilter(spaceId, request);
      filters.set(spaceId, filter);
    }
    return filter;
  }

  private async buildExecutionFilter(
    spaceId: string,
    request?: KibanaRequest
  ): Promise<estypes.QueryDslQueryContainer> {
    const profileId = request ? await this.getProfileId(request) : undefined;
    const client = this.core.elasticsearch.client.asInternalUser;
    let pitId: string;
    try {
      const snapshot = await client.openPointInTime({
        index: `${workflowIndexName}-*`,
        keep_alive: '1m',
        ignore_unavailable: true,
        allow_partial_search_results: false,
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
        const response = await client.search<WorkflowAccessSubject>({
          pit: { id: pitId, keep_alive: '1m' },
          allow_partial_search_results: false,
          size: 1000,
          _source: ['owner_id', 'access_control'],
          sort: ['_shard_doc'],
          ...(searchAfter ? { search_after: searchAfter } : {}),
          query: { term: { spaceId } },
        });
        if (response.pit_id) pitId = response.pit_id;
        if (response.timed_out || response._shards.failed > 0) {
          throw new Error('Could not determine workflow execution access from incomplete results.');
        }
        for (const { _id: id, _source: source } of response.hits.hits) {
          if (!id || !source) throw new Error('Missing workflow execution access document.');
          const accessControl = storedWorkflowAccessControlSchema.parse(source.access_control);
          if (
            !getWorkflowPermissions(
              { owner_id: source.owner_id, access_control: accessControl },
              profileId
            ).read
          ) {
            hiddenIds.push(id);
          }
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
  ): Promise<WorkflowAccessControlUpdateResponseDto> {
    const profileId = await this.getProfileId(request);
    if (!profileId) throw new WorkflowAccessDeniedError();
    const { access_mode, entries = [] } = input;
    const { authz } = this;
    const stored = await this.crud.getWorkflowDocumentWithVersion(id, spaceId);
    if (!stored) throw new WorkflowNotFoundError(id);
    const { source: existing, seqNo, primaryTerm } = stored;
    const legacyOwner =
      !existing.owner_id &&
      !existing.access_control &&
      this.core.security.authc.getCurrentUser(request)?.username === existing.createdBy;
    if (existing.managed || (!legacyOwner && existing.owner_id !== profileId)) {
      throw new WorkflowAccessDeniedError();
    }
    if (access_mode === 'private') {
      await Promise.all(
        WORKFLOW_ACCESS_CONTROL_ROLES.map(async (role) => {
          const uids = new Set(
            entries
              .filter((entry) => {
                if (entry.role !== role || entry.id === profileId) return false;
                const previous =
                  existing.access_control?.access_mode === 'private'
                    ? existing.access_control.entries.find(({ id: uid }) => uid === entry.id)
                    : undefined;
                return (
                  !previous ||
                  WORKFLOW_ACCESS_CONTROL_ROLES.indexOf(role) >
                    WORKFLOW_ACCESS_CONTROL_ROLES.indexOf(previous.role)
                );
              })
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
        })
      );
    }
    const accessControl = prepareAccessControl({
      input,
      roles: WORKFLOW_ACCESS_CONTROL_ROLES,
      ownerId: profileId,
      previous: existing.access_control,
    });
    const document = await this.crud.writeWorkflowDocumentWithOcc(id, spaceId, {
      ifSeqNo: seqNo,
      ifPrimaryTerm: primaryTerm,
      document: applyWorkflowVersion(
        {
          ...existing,
          owner_id: profileId,
          access_control: accessControl,
          updated_at: new Date().toISOString(),
          lastUpdatedBy:
            this.core.security.authc.getCurrentUser(request)?.username ?? existing.lastUpdatedBy,
        },
        existing
      ),
    });
    this.executionFilters.delete(request);
    if (!document.access_control) throw new Error('Access control was not saved.');
    return {
      owner_id: document.owner_id,
      access_control: document.access_control,
      lastUpdatedAt: document.updated_at,
      lastUpdatedBy: document.lastUpdatedBy,
      ...pickWorkflowDocumentVersion(document),
    };
  }
}
