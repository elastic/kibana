/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collectWorkflowCallSites,
  collectWorkflowOutputBlocks,
  findOutputsPassingThrough,
  findOutputUsages,
  mayLoseImplicitOutput,
  mayRecoverFromFailure,
} from './find_call_sites';
import type { StepOutputRead } from './find_call_sites';
import type { RemovalImpact, UpstreamImpact, WorkflowCallSite, WorkflowLookupItem } from './types';

/**
 * How many levels of callers-of-callers the analysis follows. Runs nest up to the configurable
 * `maxWorkflowDepth` (10 calls below the first workflow by default).
 */
export const MAX_INDIRECT_DEPTH = 10;

// The engine only finds a managed workflow, including every global one, for a managed caller.
const canRun = (
  caller: Pick<WorkflowLookupItem, 'managed'>,
  called: Pick<WorkflowLookupItem, 'managed'>
): boolean => caller.managed === true || called.managed !== true;

const appendTo = <Key, Item>(groups: Map<Key, Item[]>, key: Key, items: readonly Item[]): void => {
  groups.set(key, [...(groups.get(key) ?? []), ...items]);
};

/** How a broken workflow affects whatever runs it: it fails, or its listed outputs come back empty. */
interface WorkflowEffect {
  fails: boolean;
  emptyOutputs: ReadonlySet<string>;
  /** True when a run without a `workflow.output` step may return an empty output, of any field. */
  emptiesImplicitOutput: boolean;
}

interface CallerEdge {
  parent: WorkflowLookupItem;
  callSites: WorkflowCallSite[];
}

// A read with no `field` stands for every output of a step that failed.
const toEffect = (
  definition: unknown,
  fails: boolean,
  reads: readonly StepOutputRead[]
): WorkflowEffect => ({
  fails,
  emptyOutputs: fails
    ? new Set()
    : findOutputsPassingThrough(collectWorkflowOutputBlocks(definition), reads),
  emptiesImplicitOutput: !fails && mayLoseImplicitOutput(definition, reads),
});

const losesOutputs = ({ emptyOutputs, emptiesImplicitOutput }: WorkflowEffect): boolean =>
  emptyOutputs.size > 0 || emptiesImplicitOutput;

// A failing call fails the caller's run unless a handler might recover from it; then the caller is
// taken to keep running without the step's outputs.
const callFailureEscapes = (definition: unknown, { stepName }: WorkflowCallSite): boolean =>
  !mayRecoverFromFailure(definition, stepName);

// How a caller is affected by running a workflow with `effect`; undefined when it isn't.
const getCallerEffect = (
  { parent, callSites }: CallerEdge,
  effect: WorkflowEffect
): { effect: WorkflowEffect; field?: string } | undefined => {
  let fails = false;
  let firstField: string | undefined;
  const reads: StepOutputRead[] = [];
  // Background runs report neither their failure nor their outputs to the caller.
  const waitingCallSites = callSites.filter(({ stepType }) => stepType === 'workflow.execute');
  for (const callSite of waitingCallSites) {
    const { stepName } = callSite;
    if (effect.fails) {
      if (callFailureEscapes(parent.definition, callSite)) {
        fails = true;
      } else {
        reads.push({ stepName });
      }
    } else {
      for (const usage of findOutputUsages(parent.definition, stepName)) {
        const isEmpty =
          effect.emptiesImplicitOutput ||
          (usage.field ? effect.emptyOutputs.has(usage.field) : effect.emptyOutputs.size > 0);
        if (isEmpty && !usage.hasFallback) {
          reads.push({ stepName, field: usage.field || undefined });
          firstField ??= usage.field || [...effect.emptyOutputs][0];
        }
      }
    }
  }
  if (!fails && reads.length === 0) {
    return undefined;
  }
  return { effect: toEffect(parent.definition, fails, reads), field: firstField };
};

const mergeEffects = (first: WorkflowEffect, second: WorkflowEffect): WorkflowEffect => {
  const fails = first.fails || second.fails;
  return {
    fails,
    emptyOutputs: fails ? new Set() : new Set([...first.emptyOutputs, ...second.emptyOutputs]),
    emptiesImplicitOutput: !fails && (first.emptiesImplicitOutput || second.emptiesImplicitOutput),
  };
};

// Failing beats losing outputs, and losing more outputs beats losing fewer.
const isWorseEffect = (effect: WorkflowEffect, than: WorkflowEffect): boolean =>
  (effect.fails && !than.fails) ||
  (!effect.fails &&
    !than.fails &&
    (effect.emptyOutputs.size > than.emptyOutputs.size ||
      (effect.emptiesImplicitOutput && !than.emptiesImplicitOutput)));

/**
 * Follows a broken direct caller up the chain to the enabled workflows that fail or lose data.
 * A workflow reached through several paths gets the combined effect of all of them, and is
 * followed again whenever a later path makes its effect worse.
 */
const propagateUpstream = (
  root: WorkflowLookupItem,
  rootEffect: WorkflowEffect,
  callerEdges: ReadonlyMap<string, readonly CallerEdge[]>,
  excludedIds: ReadonlySet<string>
): UpstreamImpact[] => {
  const impacts = new Map<string, UpstreamImpact>();
  const effects = new Map<string, WorkflowEffect>();
  let frontier: Array<{ workflow: WorkflowLookupItem; effect: WorkflowEffect }> = [
    { workflow: root, effect: rootEffect },
  ];
  for (let depth = 2; depth <= MAX_INDIRECT_DEPTH && frontier.length > 0; depth++) {
    const next = new Map<string, { workflow: WorkflowLookupItem; effect: WorkflowEffect }>();
    for (const { workflow, effect } of frontier) {
      // A caller that can't run the workflow fails the same way before and after.
      const edges = (callerEdges.get(workflow.id) ?? []).filter(
        ({ parent }) =>
          parent.enabled &&
          parent.id !== root.id &&
          !excludedIds.has(parent.id) &&
          canRun(parent, workflow)
      );
      for (const edge of edges) {
        const callerEffect = getCallerEffect(edge, effect);
        const previous = effects.get(edge.parent.id);
        const merged =
          callerEffect && previous
            ? mergeEffects(previous, callerEffect.effect)
            : callerEffect?.effect;
        if (callerEffect && merged && (!previous || isWorseEffect(merged, previous))) {
          effects.set(edge.parent.id, merged);
          const previousImpact = impacts.get(edge.parent.id);
          const isNewCause = !previousImpact || (merged.fails && !previous?.fails);
          impacts.set(edge.parent.id, {
            workflowId: edge.parent.id,
            workflowName: edge.parent.name,
            effect: merged.fails ? 'fails' : 'missingOutput',
            viaName: isNewCause ? workflow.name : previousImpact.viaName,
            field: isNewCause ? callerEffect.field : previousImpact.field,
          });
          if (merged.fails || losesOutputs(merged)) {
            next.set(edge.parent.id, { workflow: edge.parent, effect: merged });
          }
        }
      }
    }
    frontier = [...next.values()];
  }
  return [...impacts.values()];
};

const groupCallSites = (definition: unknown): Map<string, WorkflowCallSite[]> => {
  const callSitesByChild = new Map<string, WorkflowCallSite[]>();
  for (const callSite of collectWorkflowCallSites(definition)) {
    appendTo(callSitesByChild, callSite.workflowId, [callSite]);
  }
  return callSitesByChild;
};

const buildCallerEdges = (
  workflows: readonly WorkflowLookupItem[]
): Map<string, readonly CallerEdge[]> => {
  const callerEdges = new Map<string, CallerEdge[]>();
  for (const workflow of workflows) {
    for (const [calleeId, callSites] of groupCallSites(workflow.definition)) {
      appendTo(callerEdges, calleeId, [{ parent: workflow, callSites }]);
    }
  }
  return callerEdges;
};

/** Lists what fails when `workflowIds` stop running (turned off or deleted), given their callers. */
export const analyzeRemovalImpact = (
  workflowIds: readonly string[],
  callers: readonly WorkflowLookupItem[]
): RemovalImpact => {
  const removedIds = new Set(workflowIds);
  const callerEdges = buildCallerEdges(callers.filter(({ id }) => !removedIds.has(id)));
  // One edge per enabled caller, with its steps that run any of the removed workflows.
  const edgesByCaller = new Map<string, CallerEdge>();
  for (const { parent, callSites } of workflowIds.flatMap((id) => callerEdges.get(id) ?? [])) {
    if (parent.enabled) {
      const previous = edgesByCaller.get(parent.id)?.callSites ?? [];
      edgesByCaller.set(parent.id, { parent, callSites: [...previous, ...callSites] });
    }
  }

  const indirectIds = new Set<string>();
  for (const { parent, callSites } of edgesByCaller.values()) {
    // Running a workflow that is off or gone fails the step, whether or not it waits.
    const fails = callSites.some((callSite) => callFailureEscapes(parent.definition, callSite));
    const reads = callSites.map(({ stepName }) => ({ stepName }));
    propagateUpstream(parent, toEffect(parent.definition, fails, reads), callerEdges, removedIds)
      .filter(({ workflowId }) => !edgesByCaller.has(workflowId))
      .forEach(({ workflowId }) => indirectIds.add(workflowId));
  }

  return {
    callers: [...edgesByCaller.values()]
      .map(({ parent: { id, name } }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indirect: indirectIds.size,
  };
};
