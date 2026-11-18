/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TaskBundlePackManifest } from '@kbn/task-manager-plugin/server/task_process/supervisor';
import type { WorkflowYaml } from '@kbn/workflows';
import { resolvePacksForDefinition } from './resolve_packs_for_definition';

/**
 * The slice of Task Manager's start contract `resolveWorkflowTaskPacks` reads: `getTaskBundlePacks`
 * is a Kibana-process-only method (bundle manifests live in Main's supervisor), so it is absent, not
 * merely unimplemented, on the host object a task process gets instead. Callers that run inside a
 * task process (a sub-workflow scheduling another run) see `undefined` here and fall back to no
 * packs specified, which asks a worker to load every pack: safe, if not yet optimized from there.
 */
export type WorkflowTaskPacksTaskManager = Pick<
  { getTaskBundlePacks?: (taskType: string) => TaskBundlePackManifest[] | undefined },
  'getTaskBundlePacks'
>;

/**
 * The id of this plugin's own `task-scheduling` contribution pack (registers the native params
 * schema of `workflow:resume`, read from `packId()`'s `<key>:<path>` format in `build.js`). Every
 * worker of every workflow task type can schedule a `workflow:resume` (idle timeouts, HITL waits),
 * independent of which steps the definition uses, so this is infrastructure a selection by step
 * type cannot drop: `resolveWorkflowTaskPacks` unions it into whatever `resolvePacksForDefinition`
 * resolves, including `[]`, so a worker that was only asked to load "nothing extra" still boots.
 */
export const WORKFLOWS_TASK_SCHEDULING_PACK_ID =
  'task-scheduling:src/platform/plugins/shared/workflows_execution_engine/server/task_types/task_scheduling_contribution.ts';

/**
 * Resolves the pack ids a `taskType` run of `definition` needs, once, so the caller can persist
 * them on a task instance's params: `getPacks` at dispatch time then reads them back with no
 * Elasticsearch call. Returns `undefined` (not `[]`) when the manifest is unavailable (worker-hosted
 * scheduling, or a bundle the build did not emit packs for), so a caller never persists an empty
 * list that would be read as "this run needs no packs" instead of "packs are not resolvable here".
 */
export const resolveWorkflowTaskPacks = (
  taskManager: WorkflowTaskPacksTaskManager,
  taskType: string,
  definition: WorkflowYaml | undefined
): string[] | undefined => {
  if (!definition) return undefined;
  const packs = taskManager.getTaskBundlePacks?.(taskType);
  if (!packs) return undefined;
  const resolved = resolvePacksForDefinition(definition, packs);
  return [...new Set([...resolved, WORKFLOWS_TASK_SCHEDULING_PACK_ID])];
};
