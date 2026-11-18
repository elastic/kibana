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
 * selects that pack.
 *
 * Any atomic step type no pack declares is assumed to be a connector step (stock or spec-based,
 * `.slack`, `http`, `.slack2`, ...): it selects every pack flagged `registersConnectorTypes` in the
 * manifest, instead of this function having to know each connector type by name. This trades a
 * precise "uncovered step type" check for simplicity: a custom step whose contribution has not been
 * annotated with `declares.stepTypes` is indistinguishable from a real connector step here, so it
 * also pulls in the connector packs rather than falling back to every pack. That miss surfaces as a
 * step failure mid-run, not a decline (see the PR's "known gaps").
 *
 * A selected pack's `declares.requires` then selects, transitively, whichever other pack's
 * `declares.provides` answers it. A `requires` entry that instead names a whole contribution key
 * (the part of a pack id before its first `:`, e.g. `agent-builder`) selects every pack under that
 * key: `ai.agent` needs every plugin's `agent-builder` registrations loaded, not a single service,
 * for its own-process registry to have parity with what Kibana registered.
 */
export const resolvePacksForDefinition = (
  definition: WorkflowYaml,
  packs: readonly TaskBundlePackManifest[]
): string[] => {
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
  const packIdsByContributionKey = new Map<string, string[]>();
  const connectorPackIds: string[] = [];
  for (const pack of packs) {
    packById.set(pack.id, pack);
    for (const stepType of pack.stepTypes ?? []) packByStepType.set(stepType, pack.id);
    for (const provided of pack.provides ?? []) packByProvides.set(provided, pack.id);
    if (pack.registersConnectorTypes) connectorPackIds.push(pack.id);
    const contributionKey = pack.id.slice(0, pack.id.indexOf(':'));
    const group = packIdsByContributionKey.get(contributionKey);
    if (group) group.push(pack.id);
    else packIdsByContributionKey.set(contributionKey, [pack.id]);
  }

  const needsConnectorPacks = [...stepTypes].some((stepType) => !packByStepType.has(stepType));

  const selected = new Set<string>();
  const queue = [...stepTypes]
    .map((stepType) => packByStepType.get(stepType))
    .filter((id): id is string => Boolean(id));
  if (needsConnectorPacks) queue.push(...connectorPackIds);
  while (queue.length) {
    const id = queue.pop();
    if (id && !selected.has(id)) {
      selected.add(id);
      for (const required of packById.get(id)?.requires ?? []) {
        const requiredPackId = packByProvides.get(required);
        const requiredPackIds = requiredPackId
          ? [requiredPackId]
          : packIdsByContributionKey.get(required) ?? [];
        for (const requiredId of requiredPackIds) {
          if (!selected.has(requiredId)) queue.push(requiredId);
        }
      }
    }
  }
  return [...selected];
};
