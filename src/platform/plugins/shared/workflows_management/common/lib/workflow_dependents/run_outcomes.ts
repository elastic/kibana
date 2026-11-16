/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { type GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { isRecord } from '@kbn/workflows-yaml';
import { isTemplatedValue, toCallSite } from './find_call_sites';
import type { WorkflowCallSite } from './types';

/**
 * How running part of a workflow can end: on to the next step, the run completed by a
 * `workflow.output` step, a failed step (which `on-failure` handlers can catch), the run ended
 * unsuccessfully (which nothing catches), or leaving a loop iteration.
 */
type Ending = 'next' | 'completed' | 'error' | 'failed' | 'break' | 'continue';

const ALL_ENDINGS: readonly Ending[] = [
  'next',
  'completed',
  'error',
  'failed',
  'break',
  'continue',
];
const FAILURES: ReadonlySet<Ending> = new Set(['error', 'failed']);

interface Outcome<Failure> {
  endings: ReadonlySet<Ending>;
  /** When every ending fails the run: the failure each run through this part reaches first. */
  failure?: Failure;
}

/** What the analysis knows about the steps whose result it can tell. */
export interface StepFailures<Failure> {
  /** The failure of a call that fails its step every time it runs, if it does. */
  callFailure: (callSite: WorkflowCallSite) => Failure | undefined;
  /**
   * For a `workflow.output` step (`workflow.fail` compiles to one): the failure it ends every run
   * with, `'mayFail'` when it might, or undefined when it completes the run.
   */
  endStepFailure: (step: Record<string, unknown>) => Failure | 'mayFail' | undefined;
}

// The compiled graph, as the engine walks it: in topological order, where an `enter-*` node opens
// a region that the matching `exit-*` node closes.
interface Region {
  /** Undefined for the whole workflow. */
  node?: GraphNodeUnion;
  children: Array<Region | Leaf>;
  parent?: Region;
}

interface Leaf {
  node: GraphNodeUnion;
  parent: Region;
}

const isRegion = (item: Region | Leaf): item is Region => 'children' in item;

const getField = (node: GraphNodeUnion | undefined, key: string): unknown =>
  node ? (node as unknown as Record<string, unknown>)[key] : undefined;

const getConfiguration = (node: GraphNodeUnion): Record<string, unknown> => {
  const configuration = getField(node, 'configuration');
  return isRecord(configuration) ? configuration : {};
};

// Whether `exit` closes the region `enter` opened, by type and by the IDs either one refers to.
const closes = (exit: GraphNodeUnion, enter: GraphNodeUnion | undefined): boolean => {
  if (!enter || exit.type !== `exit-${enter.type.slice('enter-'.length)}`) {
    return false;
  }
  const enterId = getField(exit, 'startNodeId') ?? getField(exit, 'enterNodeId');
  const exitId = getField(enter, 'exitNodeId');
  return (
    (enterId === undefined || enterId === enter.id) && (exitId === undefined || exitId === exit.id)
  );
};

const toRegions = (graph: WorkflowGraph): Region | undefined => {
  const root: Region = { children: [] };
  let current = root;
  for (const nodeId of graph.topologicalOrder) {
    const node = graph.getNode(nodeId);
    if (node.type.startsWith('enter-')) {
      const region: Region = { node, children: [], parent: current };
      current.children.push(region);
      current = region;
    } else if (node.type.startsWith('exit-')) {
      if (!current.parent || !closes(node, current.node)) {
        return undefined;
      }
      current = current.parent;
    } else {
      current.children.push({ node, parent: current });
    }
  }
  return current === root ? root : undefined;
};

const regionsCache = new WeakMap<object, Region | null>();

// The workflow's compiled regions; undefined when it doesn't compile, or not in a way known here.
const getRegions = (definition: unknown): Region | undefined => {
  if (!isRecord(definition) || !Array.isArray(definition.steps)) {
    return undefined;
  }
  let regions = regionsCache.get(definition);
  if (regions === undefined) {
    try {
      regions = toRegions(WorkflowGraph.fromWorkflowDefinition(definition as WorkflowYaml)) ?? null;
    } catch {
      regions = null;
    }
    regionsCache.set(definition, regions);
  }
  return regions ?? undefined;
};

const alwaysFails = (endings: ReadonlySet<Ending>): boolean =>
  endings.size > 0 && [...endings].every((ending) => FAILURES.has(ending));

const toOutcome = <Failure>(endings: Iterable<Ending>, failure?: Failure): Outcome<Failure> => {
  const set = new Set(endings);
  return alwaysFails(set) ? { endings: set, failure } : { endings: set };
};

// Steps the analysis has nothing to say about run like any other: they might succeed or fail.
const MIGHT_FAIL: Outcome<never> = { endings: new Set(['next', 'error']) };
// Anything the analysis doesn't know might end any way, so it never decides a verdict.
const UNKNOWN: Outcome<never> = { endings: new Set(ALL_ENDINGS) };

const STEP_NODE_TYPES = new Set(['atomic', 'wait', 'waitForInput', 'waitForApproval', 'data.set']);

const isStepNode = ({ type }: GraphNodeUnion): boolean =>
  STEP_NODE_TYPES.has(type) || type.startsWith('elasticsearch.') || type.startsWith('kibana.');

const isCallNode = ({ type }: GraphNodeUnion): boolean =>
  type === 'workflow.execute' || type === 'workflow.executeAsync';

const evaluateLeaf = <Failure>(
  node: GraphNodeUnion,
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  if (isCallNode(node)) {
    const callSite = toCallSite(getConfiguration(node));
    const failure = callSite && steps.callFailure(callSite);
    return failure ? toOutcome(['error'], failure) : MIGHT_FAIL;
  }
  if (node.type === 'workflow.output') {
    const failure = steps.endStepFailure(getConfiguration(node));
    if (failure === 'mayFail') {
      return toOutcome(['completed', 'failed']);
    }
    return failure ? toOutcome(['failed'], failure) : toOutcome(['completed']);
  }
  if (node.type === 'loop-break') {
    return toOutcome(['break']);
  }
  if (node.type === 'loop-continue') {
    return toOutcome(['continue']);
  }
  return isStepNode(node) ? MIGHT_FAIL : UNKNOWN;
};

// One part after another: each runs when the one before it goes on to the next step.
const evaluateSequence = <Failure>(
  items: ReadonlyArray<Region | Leaf>,
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  const endings = new Set<Ending>(['next']);
  let failure: Failure | undefined;
  for (const item of items) {
    if (!endings.has('next')) {
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const outcome = evaluate(item, steps);
    endings.delete('next');
    outcome.endings.forEach((ending) => endings.add(ending));
    failure = outcome.failure;
  }
  return toOutcome(endings, failure);
};

// One of several branches runs; `next` stands for the branch taken when none of them matches.
const evaluateBranches = <Failure>(
  region: Region,
  branchTypes: readonly string[],
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  const { children } = region;
  if (!children.every((child) => isRegion(child) && branchTypes.includes(child.node?.type ?? ''))) {
    return UNKNOWN;
  }
  const outcomes = children.map((child) => evaluate(child, steps));
  const hasFallbackBranch = children.some(({ node }) => node?.type === branchTypes[1]);
  const endings = new Set<Ending>(hasFallbackBranch ? [] : ['next']);
  outcomes.forEach((outcome) => outcome.endings.forEach((ending) => endings.add(ending)));
  return toOutcome(endings, outcomes[0]?.failure);
};

// A failed step runs the fallback, then fails again unless the fallback ended the run itself.
const evaluateTryBlock = <Failure>(
  region: Region,
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  const normalPath = findChildRegion(region, 'enter-normal-path');
  const fallbackPath = findChildRegion(region, 'enter-fallback-path');
  if (!normalPath || !fallbackPath || region.children.length !== 2) {
    return UNKNOWN;
  }
  const normal = evaluate(normalPath, steps);
  if (!normal.endings.has('error')) {
    return normal;
  }
  const endings = new Set(normal.endings);
  endings.delete('error');
  evaluate(fallbackPath, steps).endings.forEach((ending) =>
    endings.add(ending === 'next' ? 'error' : ending)
  );
  return toOutcome(endings, normal.failure);
};

// The engine reads a literal list directly, and parses a string that isn't a template.
const alwaysIterates = (items: unknown): boolean => {
  if (Array.isArray(items)) {
    return items.length > 0;
  }
  if (typeof items !== 'string' || isTemplatedValue(items)) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(items);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
};

// Iterations that end or leave early go on to the next one, or past the loop. A `while` loop runs
// its steps before checking its condition.
const evaluateLoop = <Failure>(region: Region, steps: StepFailures<Failure>): Outcome<Failure> => {
  const body = evaluateSequence(region.children, steps);
  const endings = new Set(body.endings);
  const leavesIteration = (['next', 'break', 'continue'] as const).filter((ending) =>
    endings.delete(ending)
  );
  const mayNotRun =
    region.node?.type === 'enter-foreach' && !alwaysIterates(getConfiguration(region.node).foreach);
  if (leavesIteration.length > 0 || mayNotRun) {
    endings.add('next');
  }
  return toOutcome(endings, body.failure);
};

// Branches hold steps only. Unless the step waits for every branch to settle, a failed branch
// fails it, and every named branch runs.
const evaluateParallel = <Failure>(
  region: Region,
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  const outcomes = region.children.map((child) =>
    isRegion(child) ? UNKNOWN : evaluateLeaf(child.node, steps)
  );
  if (
    outcomes.some(({ endings }) => [...endings].some((ending) => !MIGHT_FAIL.endings.has(ending)))
  ) {
    return UNKNOWN;
  }
  if (getConfiguration(region.node as GraphNodeUnion).mode === 'settled') {
    return toOutcome(['next']);
  }
  const failing = getField(region.node, 'branches')
    ? outcomes.find(({ endings }) => alwaysFails(endings))
    : undefined;
  return failing ? toOutcome(['error'], failing.failure) : MIGHT_FAIL;
};

// Regions whose own nodes don't change how their steps end.
const TRANSPARENT_REGIONS = new Set([
  'enter-timeout-zone',
  'enter-retry',
  'enter-normal-path',
  'enter-fallback-path',
  'enter-then-branch',
  'enter-else-branch',
  'enter-case-branch',
  'enter-default-branch',
]);

function findChildRegion(region: Region, type: string): Region | undefined {
  return region.children.find(
    (child): child is Region => isRegion(child) && child.node?.type === type
  );
}

function evaluate<Failure>(item: Region | Leaf, steps: StepFailures<Failure>): Outcome<Failure> {
  if (!isRegion(item)) {
    return evaluateLeaf(item.node, steps);
  }
  const type = item.node?.type;
  if (type === undefined || TRANSPARENT_REGIONS.has(type)) {
    return evaluateSequence(item.children, steps);
  }
  switch (type) {
    case 'enter-continue': {
      const body = evaluateSequence(item.children, steps);
      if (!body.endings.has('error')) {
        return body;
      }
      // Only `true` always continues; a KQL condition might not hold.
      const endings = new Set<Ending>([...body.endings, 'next']);
      if (getConfiguration(item.node as GraphNodeUnion).condition === true) {
        endings.delete('error');
      }
      return toOutcome(endings, body.failure);
    }
    case 'enter-try-block':
      return evaluateTryBlock(item, steps);
    case 'enter-if':
      return evaluateBranches(item, ['enter-then-branch', 'enter-else-branch'], steps);
    case 'enter-switch':
      return evaluateBranches(item, ['enter-case-branch', 'enter-default-branch'], steps);
    case 'enter-foreach':
    case 'enter-while':
      return evaluateLoop(item, steps);
    case 'enter-parallel':
      return evaluateParallel(item, steps);
    default:
      return UNKNOWN;
  }
}

/**
 * The failure every run of the workflow reaches first, when every run fails: given `steps`, no
 * path through its compiled graph completes. Undefined when a run might complete, or when the
 * workflow doesn't compile into a graph whose every node is known here.
 */
export const findAlwaysFailure = <Failure>(
  definition: unknown,
  steps: StepFailures<Failure>
): Failure | undefined => {
  const regions = getRegions(definition);
  return regions ? evaluate(regions, steps).failure : undefined;
};

// Whether a failure raised in `item` always fails the run: nothing it passes through on the way
// out of the workflow might catch it.
const errorEscapes = <Failure>(item: Region | Leaf, steps: StepFailures<Failure>): boolean => {
  const region = item.parent;
  const type = region?.node?.type;
  if (!region || type === undefined) {
    return true;
  }
  if (type === 'enter-try-block') {
    const fallbackPath = findChildRegion(region, 'enter-fallback-path');
    if (item.node?.type === 'enter-fallback-path') {
      return errorEscapes(region, steps);
    }
    if (!fallbackPath || item.node?.type !== 'enter-normal-path') {
      return false;
    }
    const { endings } = evaluate(fallbackPath, steps);
    if ([...endings].every((ending) => ending === 'failed')) {
      return true;
    }
    // When the fallback goes on, the try block fails again with the step's failure.
    return (
      [...endings].every((ending) => ending === 'next' || FAILURES.has(ending)) &&
      errorEscapes(region, steps)
    );
  }
  if (type === 'enter-parallel') {
    return (
      getConfiguration(region.node as GraphNodeUnion).mode !== 'settled' &&
      errorEscapes(region, steps)
    );
  }
  const isTransparent =
    TRANSPARENT_REGIONS.has(type) ||
    ['enter-if', 'enter-switch', 'enter-foreach', 'enter-while'].includes(type);
  return isTransparent && errorEscapes(region, steps);
};

const findCallLeaves = (region: Region, stepName: string): Leaf[] =>
  region.children.flatMap((child) => {
    if (isRegion(child)) {
      return findCallLeaves(child, stepName);
    }
    return isCallNode(child.node) && getConfiguration(child.node).name === stepName ? [child] : [];
  });

/**
 * Whether a failure of the step `stepName` (wherever the engine runs it) always fails the run: no
 * `continue` covers it, and no fallback that handles it might end the run first. False when the
 * workflow doesn't compile into a graph whose every node is known here.
 */
export const failureEscapes = <Failure>(
  definition: unknown,
  stepName: string,
  steps: StepFailures<Failure>
): boolean => {
  const regions = getRegions(definition);
  const leaves = regions ? findCallLeaves(regions, stepName) : [];
  return leaves.length > 0 && leaves.every((leaf) => errorEscapes(leaf, steps));
};
