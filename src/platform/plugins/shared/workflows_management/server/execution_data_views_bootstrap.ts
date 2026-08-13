/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '@kbn/workflows-execution-engine/common';

/**
 * Per-space TTL for the bootstrap cache.  Mirrors Cases' `BOOTSTRAP_CACHE_TTL_MS` (60 s):
 * if a managed data view is deleted, the ensure path re-runs after this window, so a deleted
 * view self-heals within one minute.  A plain `Set` (no TTL) would never re-create a deleted
 * view until Kibana restarts.
 */
const BOOTSTRAP_CACHE_TTL_MS = 60 * 1_000;

/**
 * Returns `true` for the two outcomes that mean "the view already exists and no action is
 * needed":
 *
 * 1. ES `version_conflict_engine_exception` — two Kibana nodes raced on the SO write.
 * 2. Data-views `DuplicateDataViewError` — the `createSavedObject` name check saw the
 *    other node's doc first.
 *
 * Both are benign: the winning create already wrote the correct spec.
 */
function isAlreadyExistsError(err: unknown): boolean {
  if ((err as { name?: string })?.name === 'DuplicateDataViewError') return true;
  const status =
    (err as { statusCode?: number })?.statusCode ??
    (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
  if (status === 409) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /version_conflict_engine_exception|document already exists/i.test(message);
}

/**
 * Bootstraps two managed, per-space data views for the workflow execution indices
 * (`.workflows-executions` and `.workflows-step-executions`) so users can reach them
 * from Discover, Lens, and dashboards via the implicit privileges granted by
 * `KibanaWorkflowsImplicitPrivilegesProvider`.
 *
 * ## Design notes
 *
 * - Two separate views, not one combined view: both indices share field names (`id`, `status`,
 *   `duration`, `startedAt`, `workflowId`, `stepId`, `usage.*`) with incompatible meanings, so
 *   a single merged view would silently produce wrong aggregations in Lens.
 *
 * - `create` + `createSavedObject` instead of `createAndSave`: `createAndSave` unconditionally
 *   calls `setDefault(id, force=false)`, which would claim the space's default data view slot on
 *   the first workflows request in a new space — silently making a managed analytics view the
 *   default across Discover and Lens.  `create` + `createSavedObject(overwrite=false)` skips
 *   that side effect.
 *
 * - `skipFetchFields: true`: fields come from the mapping, not a field-caps round-trip.
 *
 * - 60 s TTL cache: if someone deletes the managed view, the bootstrap re-runs after the TTL
 *   and self-heals.
 *
 * - `byPassCapabilities: true` on the data-views service factory: the request-handler context
 *   may be a viewer who lacks `indexPatterns.save`, yet the bootstrap must still succeed.
 */
export class ExecutionDataViewsBootstrap {
  private readonly bootstrappedSpaces = new Map<string, number /* ensuredAt */>();

  constructor(
    private readonly dataViewsPlugin: DataViewsServerPluginStart,
    private readonly logger: Logger
  ) {}

  /**
   * Fire-and-forget bootstrap called from the route handler context provider.  Returns
   * immediately after launching the ensure; errors are caught and logged so they never
   * propagate to the user-facing response.
   */
  ensureForSpaceFireAndForget(
    spaceId: string,
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    request: KibanaRequest
  ): void {
    const cached = this.bootstrappedSpaces.get(spaceId);
    if (cached !== undefined && Date.now() - cached < BOOTSTRAP_CACHE_TTL_MS) {
      return; // within TTL — skip
    }

    void this.ensureForSpace(spaceId, savedObjectsClient, esClient, request).catch((err) => {
      this.logger.warn(
        `ExecutionDataViewsBootstrap: failed to ensure data views for space "${spaceId}": ${err}`
      );
    });
  }

  private async ensureForSpace(
    spaceId: string,
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    request: KibanaRequest
  ): Promise<void> {
    // Stamp the cache before the async work so concurrent in-process calls collapse.
    this.bootstrappedSpaces.set(spaceId, Date.now());

    const dvService = await this.dataViewsPlugin.dataViewsServiceFactory(
      savedObjectsClient,
      esClient,
      request,
      true /* byPassCapabilities */
    );

    const views: Array<{ id: string; title: string; name: string }> = [
      {
        id: `workflows-executions-managed-${spaceId}`,
        title: WORKFLOWS_EXECUTIONS_INDEX,
        name: 'Workflow executions',
      },
      {
        id: `workflows-step-executions-managed-${spaceId}`,
        title: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        name: 'Workflow step executions',
      },
    ];

    for (const { id, title, name } of views) {
      try {
        const existing = await dvService.get(id).catch(() => null);
        if (existing !== null) {
          this.logger.debug(`ExecutionDataViewsBootstrap: data view ${id} already exists`);
          continue;
        }

        // Deliberately NOT `createAndSave` — see class-level design note.
        const dataView = await dvService.create(
          {
            id,
            title,
            name,
            timeFieldName: 'startedAt',
            allowNoIndex: true,
            namespaces: [spaceId],
          },
          true /* skipFetchFields */
        );
        await dvService.createSavedObject(dataView, false /* overwrite */);
        this.logger.debug(
          `ExecutionDataViewsBootstrap: bootstrapped data view ${id} for space "${spaceId}"`
        );
      } catch (err) {
        if (isAlreadyExistsError(err)) {
          this.logger.debug(
            `ExecutionDataViewsBootstrap: data view ${id} already created by another Kibana node`
          );
        } else {
          // Rethrow so the outer catch can log the error; don't swallow unknown failures.
          throw err;
        }
      }
    }
  }
}
