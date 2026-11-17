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
import { convertToWorkflowGraph, isAtomic } from '@kbn/workflows/graph';
import { isSpecConnectorStepType } from './is_spec_connector_step_type';

/**
 * Pack ids a workflow definition needs, read once (at schedule, resume creation, or a scheduled
 * run's dispatch) so `TaskTypeRegistrationOptions.getPacks` is a pure in-memory read of the
 * persisted result at dispatch time, with no Elasticsearch call between a run being due and a
 * worker being acquired.
 *
 * Walks the full execution graph, not just the top-level step list: `convertToWorkflowGraph`
 * already resolves branches, loops, foreach, parallel blocks and sub-workflow calls into one
 * graph, so a step type nested inside any of those is found the same as a top-level one.
 *
 * Only atomic nodes (`isAtomic`) are step types this engine does not serve itself: built-in and
 * control-flow steps (`if`, `foreach`, `data.set`, `elasticsearch.*`, `kibana.*`, ...) never need
 * a pack and are not even considered here, the same split `collectWorkflowRequirements` uses for
 * the worker's own preflight check. Each atomic step type a pack declares (`declares.stepTypes`)
 * selects that pack; a selected pack's `declares.requires` then selects, transitively, whichever
 * other pack's `declares.provides` answers it.
 *
 * A step type not declared by any pack is skipped, not treated as uncovered, when it is a stock
 * connector step (`isFloorServedStepType`): its executor is the actions plugin's own, already in
 * the floor, not a pack. A workflow built entirely from stock connector and built-in steps
 * therefore resolves to `[]` (plus whatever `resolveWorkflowTaskPacks` unions in), not `undefined`.
 *
 * Returns `undefined`, not `[]`, when an atomic step type is neither declared by a pack nor a stock
 * connector step: a custom step whose contribution has not yet been annotated with
 * `declares.stepTypes`, or a system-connector step registered by a pack in a way this function does
 * not yet recognize (tracked separately from the stock-connector case above, since persisting `[]`
 * for a step this function cannot actually place would ask a worker to load zero packs for a step
 * it cannot serve). `[]` is reserved for a definition this function is certain needs nothing beyond
 * the floor.
 */
const isFloorServedStepType = (stepType: string): boolean => {
  // `connector_step.ts`'s own hardcoded log step, not a real connector; never pack-provided.
  if (stepType === 'console') return true;
  const [connectorType] = stepType.includes('.') ? stepType.split('.', 2) : [stepType];
  return isSpecConnectorStepType(connectorType);
};
export const resolvePacksForDefinition = (
  definition: WorkflowYaml,
  packs: readonly TaskBundlePackManifest[]
): string[] | undefined => {
  const graph = convertToWorkflowGraph(definition);
  const stepTypes = new Set(
    graph
      .nodes()
      .map((nodeId) => graph.node(nodeId))
      .filter(isAtomic)
      .map((node) => node.stepType)
      .filter((stepType): stepType is string => typeof stepType === 'string')
  );

  const packByStepType = new Map<string, string>();
  const packByProvides = new Map<string, string>();
  const packById = new Map<string, TaskBundlePackManifest>();
  for (const pack of packs) {
    packById.set(pack.id, pack);
    for (const stepType of pack.stepTypes ?? []) packByStepType.set(stepType, pack.id);
    for (const provided of pack.provides ?? []) packByProvides.set(provided, pack.id);
  }

  const uncovered = [...stepTypes].some(
    (stepType) => !packByStepType.has(stepType) && !isFloorServedStepType(stepType)
  );
  if (uncovered) return undefined;

  const selected = new Set<string>();
  const queue = [...stepTypes]
    .map((stepType) => packByStepType.get(stepType))
    .filter((id): id is string => Boolean(id));
  while (queue.length) {
    const id = queue.pop();
    if (id && !selected.has(id)) {
      selected.add(id);
      for (const required of packById.get(id)?.requires ?? []) {
        const requiredPackId = packByProvides.get(required);
        if (requiredPackId && !selected.has(requiredPackId)) queue.push(requiredPackId);
      }
    }
  }
  return [...selected];
};
