/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflow, WorkflowDetailDto } from '../..';
import { storedWorkflowAccessControlSchema } from '../../common/access_control';
import { pickWorkflowDocumentVersion } from '../../common/utils';
import { GLOBAL_WORKFLOW_SPACE_ID, WORKFLOW_INDEX_NAME } from '../constants';
import { buildWorkflowFilters } from '../lib/workflow_filters';
import type { ManagedFilter } from '../lib/workflow_filters';

export interface WorkflowRepositoryOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
}

export type WorkflowRepositoryParams = Omit<WorkflowRepositoryOptions, 'indexName'> & {
  indexName?: string;
};

export interface WorkflowLookupOptions {
  includeGlobal?: boolean;
  managedFilter?: ManagedFilter;
}

/** How many workflows {@link WorkflowRepository.getWorkflowNames} reads in one request. */
export const WORKFLOW_NAMES_CHUNK_SIZE = 1000;

export class WorkflowRepository {
  private options: WorkflowRepositoryOptions;

  constructor(params: WorkflowRepositoryParams) {
    this.options = { ...params, indexName: params.indexName || WORKFLOW_INDEX_NAME };
  }

  /**
   * Get a workflow by ID and space ID
   */
  async getWorkflow(
    workflowId: string,
    spaceId: string,
    options?: WorkflowLookupOptions & { includeDeleted?: boolean }
  ): Promise<EsWorkflow | null> {
    try {
      const { must, must_not } = buildWorkflowFilters({
        ids: [workflowId],
        space: {
          id: spaceId,
          includeGlobal: options?.includeGlobal ?? false,
        },
        deleted: options?.includeDeleted ? 'all' : 'not_deleted',
        managed: options?.managedFilter,
      });

      const response = await this.options.esClient.search({
        index: this.options.indexName,
        allow_partial_search_results: false,
        query: {
          bool: {
            must,
            must_not,
          },
        },
        size: 1,
        track_total_hits: false,
      });

      if (response.timed_out || response._shards.failed > 0) {
        throw new Error('Could not load workflow access from incomplete search results.');
      }
      if (response.hits.hits.length === 0) {
        return null;
      }

      const document = response.hits.hits[0];
      if (!document._source) {
        return null;
      }

      // Map index _source → EsWorkflow (read created_at / updated_at; EsWorkflow uses createdAt / lastUpdatedAt).
      const source = document._source as Record<string, unknown>;
      const accessControl = storedWorkflowAccessControlSchema.parse(source.access_control);
      const managed = typeof source.managed === 'boolean' ? (source.managed as boolean) : undefined;
      const managedBy = typeof source.managedBy === 'string' ? source.managedBy : undefined;
      const billable = typeof source.billable === 'boolean' ? source.billable : undefined;
      const originManagedWorkflowId =
        typeof source.originManagedWorkflowId === 'string'
          ? source.originManagedWorkflowId
          : undefined;
      const managedVersion =
        typeof source.managedVersion === 'number' ? source.managedVersion : undefined;
      return {
        id: workflowId,
        ...(source.owner_id ? { owner_id: source.owner_id as string } : {}),
        ...(accessControl ? { access_control: accessControl } : {}),
        name: source.name as string,
        description: source.description as string | undefined,
        enabled: source.enabled as boolean,
        tags: (source.tags as string[] | undefined) || [],
        valid: source.valid as boolean,
        createdAt: new Date(source.created_at as string),
        createdBy: source.createdBy as string,
        lastUpdatedAt: new Date(source.updated_at as string),
        lastUpdatedBy: source.lastUpdatedBy as string,
        definition: source.definition as EsWorkflow['definition'],
        deleted_at: source.deleted_at ? new Date(source.deleted_at as string) : null,
        yaml: source.yaml as string,
        ...(managed !== undefined ? { managed } : {}),
        ...(managedBy !== undefined ? { managedBy } : {}),
        ...(billable !== undefined ? { billable } : {}),
        ...(originManagedWorkflowId !== undefined ? { originManagedWorkflowId } : {}),
        ...(managedVersion !== undefined ? { managedVersion } : {}),
        ...pickWorkflowDocumentVersion(source),
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      this.options.logger.error(`Failed to get workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a workflow is enabled by ID and space ID
   */
  async isWorkflowEnabled(
    workflowId: string,
    spaceId: string,
    options?: WorkflowLookupOptions
  ): Promise<boolean> {
    const map = await this.areWorkflowsEnabled([{ workflowId, spaceId }], options);
    return map.get(`${spaceId}:${workflowId}`) ?? false;
  }

  /** Reads the enabled state from the translog after an execution becomes searchable. */
  async isWorkflowEnabledRealtime(workflowId: string, spaceId: string): Promise<boolean> {
    try {
      const response = await this.options.esClient.get<{
        enabled?: boolean;
        spaceId?: string;
        deleted_at?: string | null;
      }>({
        index: this.options.indexName,
        id: workflowId,
        _source_includes: ['enabled', 'spaceId', 'deleted_at'],
        realtime: true,
      });
      const source = response._source;
      return source?.spaceId === spaceId && source.enabled === true && !source.deleted_at;
    } catch (error) {
      if (error.statusCode === 404) return false;
      throw error;
    }
  }

  /** Checks managed child eligibility in the execution space or global catalog without comparing revisions. */
  async isManagedChildAdmissibleRealtime(workflowId: string, spaceId: string): Promise<boolean> {
    try {
      const response = await this.options.esClient.get<{
        enabled?: boolean;
        spaceId?: string;
        managed?: boolean;
        valid?: boolean;
        deleted_at?: string | null;
      }>({
        index: this.options.indexName,
        id: workflowId,
        _source_includes: ['enabled', 'spaceId', 'managed', 'valid', 'deleted_at'],
        realtime: true,
      });
      const source = response._source;
      return Boolean(
        source &&
          (source.spaceId === spaceId || source.spaceId === GLOBAL_WORKFLOW_SPACE_ID) &&
          source.enabled === true &&
          source.managed === true &&
          source.valid === true &&
          !source.deleted_at
      );
    } catch (error) {
      if (error.statusCode === 404) return false;
      throw error;
    }
  }

  /**
   * Bulk-check whether the given (workflowId, spaceId) pairs refer to enabled,
   * non-soft-deleted workflows. Runs a single `_search` fetching only the
   * `enabled` field across all requested ids.
   *
   * When `options.includeGlobal` is `true`, a workflow stored in the global
   * space (`*`) is considered visible for each requested space and contributes
   * to that `${spaceId}:${workflowId}` result.
   *
   * The returned map is keyed by `${spaceId}:${workflowId}`. Missing docs and
   * soft-deleted docs (`deleted_at` present) resolve to `false`.
   */
  async areWorkflowsEnabled(
    refs: Array<{ workflowId: string; spaceId: string }>,
    options?: WorkflowLookupOptions
  ): Promise<Map<string, boolean>> {
    const states = await this.getWorkflowExecutionStates(refs, options);
    return new Map([...states].map(([key, state]) => [key, state.enabled]));
  }

  /** Loads current enabled state and ACLs in one query, with missing and deleted workflows disabled. */
  async getWorkflowExecutionStates(
    refs: Array<{ workflowId: string; spaceId: string }>,
    options?: WorkflowLookupOptions
  ): Promise<Map<string, Pick<EsWorkflow, 'enabled' | 'owner_id' | 'access_control'>>> {
    const result = new Map<string, Pick<EsWorkflow, 'enabled' | 'owner_id' | 'access_control'>>();
    if (refs.length === 0) {
      return result;
    }

    const uniqueKeys = new Set<string>();
    const bySpace = new Map<string, Set<string>>();
    for (const { workflowId, spaceId } of refs) {
      const key = `${spaceId}:${workflowId}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        let ids = bySpace.get(spaceId);
        if (!ids) {
          ids = new Set<string>();
          bySpace.set(spaceId, ids);
        }
        ids.add(workflowId);
      }
    }

    const should = Array.from(bySpace.entries()).map(([spaceId, ids]) => {
      const filter = buildWorkflowFilters({
        ids: Array.from(ids),
        space: {
          id: spaceId,
          includeGlobal: options?.includeGlobal ?? false,
        },
        managed: options?.managedFilter,
      });

      return {
        bool: filter,
      };
    });

    try {
      const response = await this.options.esClient.search({
        index: this.options.indexName,
        _source: ['enabled', 'spaceId', 'owner_id', 'access_control'],
        allow_partial_search_results: false,
        size: uniqueKeys.size,
        track_total_hits: false,
        query: {
          bool: {
            should,
            minimum_should_match: 1,
            ...buildWorkflowFilters({ deleted: 'not_deleted' }),
          },
        },
      });

      if (response.timed_out || response._shards.failed > 0) {
        throw new Error('Could not load workflow access from incomplete search results.');
      }
      const requestedSpacesByWorkflowId = refs.reduce<Map<string, Set<string>>>((acc, ref) => {
        const existing = acc.get(ref.workflowId) ?? new Set<string>();
        existing.add(ref.spaceId);
        acc.set(ref.workflowId, existing);
        return acc;
      }, new Map<string, Set<string>>());

      for (const hit of response.hits.hits) {
        const source = hit._source as
          | (Pick<EsWorkflow, 'enabled' | 'owner_id' | 'access_control'> & { spaceId?: string })
          | undefined;
        if (source) {
          const state = {
            enabled: source.enabled ?? false,
            owner_id: source.owner_id,
            access_control: storedWorkflowAccessControlSchema.parse(source.access_control),
          };
          if (source.spaceId === GLOBAL_WORKFLOW_SPACE_ID && options?.includeGlobal) {
            const requestedSpaces = requestedSpacesByWorkflowId.get(hit._id ?? '');
            requestedSpaces?.forEach((requestedSpaceId) => {
              result.set(`${requestedSpaceId}:${hit._id}`, state);
            });
          } else {
            const key = `${source.spaceId}:${hit._id}`;
            result.set(key, state);
          }
        }
      }
    } catch (error) {
      if (error.statusCode === 404) {
        return result;
      }
      this.options.logger.error(`Failed to bulk-check workflow enabled flags: ${error}`);
      throw error;
    }

    for (const key of uniqueKeys) {
      if (!result.has(key)) {
        result.set(key, { enabled: false });
      }
    }

    return result;
  }

  /**
   * Loads the names of workflows, keyed by `${spaceId}:${workflowId}`. Missing and soft-deleted
   * workflows are left out, and so is a workflow whose ID exists in another space than the one
   * asked for. Global workflows are not looked up, since they cannot be bound to a service account.
   *
   * Reads the workflows by ID in chunks of {@link WORKFLOW_NAMES_CHUNK_SIZE}, one after another,
   * and starts no further chunk once `signal` is aborted. Throws rather than return a partial
   * result when a document cannot be read.
   */
  async getWorkflowNames(
    refs: ReadonlyArray<{ workflowId: string; spaceId: string }>,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const requested = new Set(refs.map(({ workflowId, spaceId }) => `${spaceId}:${workflowId}`));
    const ids = [...new Set(refs.map(({ workflowId }) => workflowId))];

    for (let start = 0; start < ids.length; start += WORKFLOW_NAMES_CHUNK_SIZE) {
      signal?.throwIfAborted();

      let response: estypes.MgetResponse<
        Pick<EsWorkflow, 'name'> & { spaceId?: string; deleted_at?: string | null }
      >;
      try {
        response = await this.options.esClient.mget<
          Pick<EsWorkflow, 'name'> & { spaceId?: string; deleted_at?: string | null }
        >(
          {
            index: this.options.indexName,
            ids: ids.slice(start, start + WORKFLOW_NAMES_CHUNK_SIZE),
            _source_includes: ['name', 'spaceId', 'deleted_at'],
          },
          { signal }
        );
      } catch (error) {
        if (error.statusCode === 404) {
          return result;
        }
        throw error;
      }

      for (const doc of response.docs) {
        // A missing index means there are no workflows to name, not that the read failed.
        if ('error' in doc && doc.error.type !== 'index_not_found_exception') {
          throw new Error(`Could not load the name of workflow [${doc._id}]: ${doc.error.type}`);
        }

        const source = 'found' in doc && doc.found ? doc._source : undefined;
        const key = `${source?.spaceId}:${doc._id}`;
        if (source && !source.deleted_at && typeof source.name === 'string' && requested.has(key)) {
          result.set(key, source.name);
        }
      }
    }

    return result;
  }

  /**
   * Returns all enabled, non-deleted workflows in the space that are subscribed to the given trigger type.
   * Uses PIT-based pagination to handle large result sets.
   */
  async getWorkflowsSubscribedToTrigger(
    triggerId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto[]> {
    const pageSize = 1000;
    const MAX_PAGES = 50;
    const keepAlive = '1m';
    const sort: estypes.Sort = [{ updated_at: { order: 'desc' } }, '_shard_doc'];
    const workflowFilters = buildWorkflowFilters({
      space: { id: spaceId, includeGlobal: true },
      deleted: 'not_deleted',
    });
    const query = {
      bool: {
        must: [
          ...workflowFilters.must,
          { term: { enabled: true } },
          { term: { triggerTypes: triggerId } },
        ],
        must_not: workflowFilters.must_not,
      },
    };
    const _source = [
      'name',
      'description',
      'enabled',
      'yaml',
      'definition',
      'createdBy',
      'lastUpdatedBy',
      'valid',
      'created_at',
      'updated_at',
      'managed',
      'managedBy',
      'originManagedWorkflowId',
      'managedVersion',
      'version',
    ];

    const pitResponse = await this.options.esClient.openPointInTime({
      index: this.options.indexName,
      keep_alive: keepAlive,
      ignore_unavailable: true,
    });
    const pitId = pitResponse.id;

    try {
      const allHits: Array<{ _id: string; _source: Record<string, unknown> }> = [];
      let searchAfter: estypes.SearchHit['sort'] | undefined;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;
        const searchResponse = await this.options.esClient.search({
          pit: { id: pitId, keep_alive: keepAlive },
          size: pageSize,
          _source,
          query,
          sort,
          ...(searchAfter ? { search_after: searchAfter } : {}),
        });

        const hits = searchResponse.hits.hits;
        for (const hit of hits) {
          if (hit._source && hit._id) {
            allHits.push({ _id: hit._id, _source: hit._source as Record<string, unknown> });
          }
        }

        hasMore = hits.length >= pageSize;
        if (hasMore) {
          const lastHit = hits[hits.length - 1];
          if (!lastHit.sort) {
            throw new Error(
              `Missing sort value on last hit (required for search_after). Last hit: ${JSON.stringify(
                lastHit
              )}`
            );
          }
          searchAfter = lastHit.sort;
        }
      }

      if (hasMore && pageCount >= MAX_PAGES) {
        this.options.logger.warn(
          `getWorkflowsSubscribedToTrigger truncated at ${MAX_PAGES} pages (${
            pageCount * pageSize
          } workflows) for trigger ${triggerId} in space ${spaceId}`
        );
      }

      return allHits.map(({ _id, _source: source }) => ({
        id: _id,
        name: source.name as string,
        description: source.description as string | undefined,
        enabled: source.enabled as boolean,
        yaml: source.yaml as string,
        definition: source.definition as WorkflowDetailDto['definition'],
        createdBy: source.createdBy as string,
        lastUpdatedBy: source.lastUpdatedBy as string,
        valid: source.valid as boolean,
        createdAt: source.created_at as string,
        lastUpdatedAt: source.updated_at as string,
        ...(source.managed === true ? { managed: true } : {}),
        ...(typeof source.managedBy === 'string' ? { managedBy: source.managedBy } : {}),
        ...(typeof source.originManagedWorkflowId === 'string'
          ? { originManagedWorkflowId: source.originManagedWorkflowId }
          : {}),
        ...(typeof source.managedVersion === 'number'
          ? { managedVersion: source.managedVersion }
          : {}),
        ...pickWorkflowDocumentVersion(source),
      }));
    } finally {
      try {
        await this.options.esClient.closePointInTime({ id: pitId });
      } catch (closeErr) {
        this.options.logger.warn(`Failed to close PIT ${pitId}: ${closeErr}`);
      }
    }
  }
}
