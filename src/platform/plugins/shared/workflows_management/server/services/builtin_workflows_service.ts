/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundError } from '@kbn/es-errors';
import type { WorkflowYaml } from '@kbn/workflows';

import type { WorkflowCrudDeps } from './types';
import {
  getTriggerTypesFromDefinition,
  prepareWorkflowDocument,
} from '../api/lib/workflow_prepare';
import type { WorkflowProperties } from '../storage/workflow_storage';
import { scheduleWorkflowTriggers } from '../task_defs/schedule_workflow_triggers';

/**
 * A built-in workflow registered by a Kibana plugin at setup time.
 *
 * Unlike `CreateWorkflowCommand` (user-driven via the HTTP API) this shape:
 *
 * - Requires `id` — built-ins must be addressable by a stable identifier so
 *   subsequent restarts upsert in place instead of creating duplicates.
 * - Requires `owner` — the registering plugin's id, recorded as
 *   `createdBy`/`lastUpdatedBy` for audit. Built-ins never have a Kibana user
 *   to attribute to.
 */
export interface BuiltinWorkflowCommand {
  id: string;
  yaml: string;
  owner: string;
}

export interface EnsureBuiltinWorkflowResult {
  id: string;
  status: 'created' | 'updated' | 'unchanged';
}

/**
 * Setup-time API for plugin-registered ("built-in") workflows.
 *
 * Built-in workflows are owned by a Kibana plugin (not a user), upserted
 * idempotently by stable id on every plugin start, and scheduled in "system"
 * mode — Task Manager does not mint a per-user API key. They are intended for
 * pipelines that need to start running before any user has logged in (e.g.
 * the threat-intelligence source-ingestion workflow).
 *
 * Behavior contract:
 * - Validation uses the **loose** YAML schema (no dynamic connector
 *   narrowing) so built-ins can be registered before the actions plugin
 *   start phase exposes a connector list.
 * - `createdBy` / `lastUpdatedBy` is the supplied `owner` string, not a
 *   resolved user.
 * - Schedulable triggers are scheduled through `WorkflowTaskScheduler`
 *   without a `KibanaRequest`. The underlying scheduled-workflow task type
 *   must accept a missing `fakeRequest` for these to actually execute; that
 *   piece lives in the workflows-execution-engine plugin and is gated
 *   separately. Until then the workflow records exist (visible in the
 *   Workflows UI) and Task Manager tasks are scheduled, but the runner
 *   currently refuses to execute scheduled tasks without an API key.
 * - The space-scope is whatever `spaceId` is passed. The default space is
 *   recommended for built-ins so the workflow is visible to operators
 *   across spaces via Workflow Management's space-filter UI.
 */
export class BuiltinWorkflowsService {
  constructor(private readonly deps: WorkflowCrudDeps) {}

  /**
   * Idempotent upsert: creates the workflow if absent, updates if present,
   * returns `'unchanged'` when the existing YAML matches byte-for-byte.
   *
   * Errors are propagated to the caller. The plugin start phase should
   * `.catch()` failures so an offline ES at boot doesn't take down Kibana.
   */
  async ensureWorkflow(
    workflow: BuiltinWorkflowCommand,
    spaceId: string
  ): Promise<EnsureBuiltinWorkflowResult> {
    const zodSchema = this.deps.validationService.getBuiltinWorkflowZodSchema();
    const now = new Date();
    const triggerDefinitions = this.deps.workflowsExtensions?.getAllTriggerDefinitions() ?? [];

    const { id: preparedId, workflowData, definition } = prepareWorkflowDocument({
      workflow: { id: workflow.id, yaml: workflow.yaml },
      zodSchema,
      authenticatedUser: workflow.owner,
      now,
      spaceId,
      triggerDefinitions,
    });

    if (preparedId !== workflow.id) {
      // prepareWorkflowDocument only changes the id when the caller didn't
      // supply one. Built-ins always supply `id`; mismatch means a bug.
      throw new Error(
        `BuiltinWorkflowsService: prepared id '${preparedId}' does not match requested id '${workflow.id}'`
      );
    }

    const existing = await this.getExistingByIdAnySpace(workflow.id);

    if (!existing) {
      return this.createBuiltin(workflow.id, spaceId, workflowData, definition);
    }

    if (existing.yaml === workflow.yaml && existing.spaceId === spaceId) {
      // Re-schedule the triggers in case the task SO was lost (idempotent
      // by task id). Costs nothing on the common path.
      await scheduleWorkflowTriggers({
        workflowId: workflow.id,
        definition,
        spaceId,
        taskScheduler: this.deps.getTaskScheduler(),
        logger: this.deps.logger,
      });
      return { id: workflow.id, status: 'unchanged' };
    }

    return this.updateBuiltin(workflow.id, spaceId, workflow.owner, workflowData, definition);
  }

  /**
   * Bulk variant of `ensureWorkflow`. Each entry is processed independently;
   * one failure does not stop the others. Failures are returned alongside
   * successes so the caller can log a partial-failure summary.
   */
  async bulkEnsureWorkflows(
    workflows: BuiltinWorkflowCommand[],
    spaceId: string
  ): Promise<{
    results: EnsureBuiltinWorkflowResult[];
    failures: Array<{ id: string; error: string }>;
  }> {
    const results: EnsureBuiltinWorkflowResult[] = [];
    const failures: Array<{ id: string; error: string }> = [];

    for (const wf of workflows) {
      try {
        results.push(await this.ensureWorkflow(wf, spaceId));
      } catch (err) {
        failures.push({
          id: wf.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { results, failures };
  }

  private async createBuiltin(
    id: string,
    spaceId: string,
    workflowData: WorkflowProperties,
    definition: WorkflowYaml | undefined
  ): Promise<EnsureBuiltinWorkflowResult> {
    await this.deps.workflowStorage.getClient().index({
      id,
      document: workflowData,
      op_type: 'create',
      refresh: true,
    });

    await scheduleWorkflowTriggers({
      workflowId: id,
      definition,
      spaceId,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
    });

    return { id, status: 'created' };
  }

  private async updateBuiltin(
    id: string,
    spaceId: string,
    owner: string,
    workflowData: WorkflowProperties,
    definition: WorkflowYaml | undefined
  ): Promise<EnsureBuiltinWorkflowResult> {
    // Preserve `created_at` / `createdBy` from the existing document so the
    // audit trail survives YAML updates; everything else is replaced by the
    // freshly-prepared `workflowData`.
    const existing = await this.getExistingByIdAnySpace(id);
    const merged: WorkflowProperties = {
      ...workflowData,
      created_at: existing?.created_at ?? workflowData.created_at,
      createdBy: existing?.createdBy ?? owner,
      lastUpdatedBy: owner,
      // Keep triggerTypes in sync with the new definition.
      triggerTypes: getTriggerTypesFromDefinition(workflowData.definition) ?? [],
    };

    await this.deps.workflowStorage.getClient().index({
      id,
      document: merged,
      refresh: true,
    });

    await scheduleWorkflowTriggers({
      workflowId: id,
      definition,
      spaceId,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
    });

    return { id, status: 'updated' };
  }

  /**
   * Look up the workflow by id across all spaces (built-in ids must be
   * globally unique — same rationale as WorkflowCrudService.checkExistingIds:
   * the ES `_id` is unique per index regardless of `spaceId`).
   *
   * Soft-deleted tombstones are intentionally included so re-installing a
   * built-in that an operator previously deleted updates the tombstone in
   * place rather than failing with a 409 from `op_type: 'create'`.
   */
  private async getExistingByIdAnySpace(id: string): Promise<WorkflowProperties | null> {
    try {
      const response = await this.deps.workflowStorage.getClient().search({
        query: { ids: { values: [id] } },
        size: 1,
        track_total_hits: false,
      });

      const hit = response.hits.hits[0];
      if (!hit?._source) {
        return null;
      }
      return hit._source as WorkflowProperties;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }
}
