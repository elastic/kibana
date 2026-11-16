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
import {
  collectWorkflowOutputBlocks,
  isCompletingOutputStep,
  isTemplatedValue,
  toCallSite,
} from './find_call_sites';
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
  /** Whether a run through this part might reach steps the analysis doesn't know how they end. */
  unknown?: boolean;
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
  /** For a parallel step, the steps of each branch in the order they run. */
  branches?: Leaf[][];
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

// Each branch of a parallel step is a line of steps from its start node to the exit node; branches
// interleave in topological order. Undefined when the region isn't made of such lines.
const toBranches = (graph: WorkflowGraph, region: Region): Leaf[][] | undefined => {
  const leaves = new Map<string, Leaf>();
  for (const child of region.children) {
    if (isRegion(child)) {
      return undefined;
    }
    leaves.set(child.node.id, child);
  }
  const branchStarts = getField(region.node, 'branches');
  const startIds = Array.isArray(branchStarts)
    ? branchStarts.map((branch: unknown) => (isRecord(branch) ? branch.startNodeId : undefined))
    : [getField(region.node, 'branchStartNodeId')];
  const exitId = getField(region.node, 'exitNodeId');
  const branches: Leaf[][] = [];
  const placed = new Set<Leaf>();
  for (const startId of startIds) {
    const branch: Leaf[] = [];
    for (let nodeId = startId; nodeId !== exitId; ) {
      const leaf = typeof nodeId === 'string' ? leaves.get(nodeId) : undefined;
      const successors = leaf ? graph.getDirectSuccessors(leaf.node.id) : [];
      if (!leaf || placed.has(leaf) || successors.length !== 1) {
        return undefined;
      }
      placed.add(leaf);
      branch.push(leaf);
      nodeId = successors[0].id;
    }
    branches.push(branch);
  }
  return placed.size === leaves.size ? branches : undefined;
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
      if (node.type === 'exit-parallel') {
        current.branches = toBranches(graph, current);
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

// The outcome with `endings`, unknown when any of the outcomes it was made from is.
const toOutcome = <Failure>(
  endings: Iterable<Ending>,
  failure?: Failure,
  from: ReadonlyArray<Outcome<Failure>> = []
): Outcome<Failure> => {
  const set = new Set(endings);
  const unknown = from.some((outcome) => outcome.unknown);
  return {
    endings: set,
    ...(alwaysFails(set) ? { failure } : {}),
    ...(unknown ? { unknown } : {}),
  };
};

// Steps the analysis has nothing to say about run like any other: they might succeed or fail.
const MIGHT_FAIL: Outcome<never> = { endings: new Set(['next', 'error']) };
// Anything the analysis doesn't know might end any way, so it never decides a verdict.
const UNKNOWN: Outcome<never> = { endings: new Set(ALL_ENDINGS), unknown: true };

const STEP_NODE_TYPES = new Set(['atomic', 'wait', 'waitForInput', 'waitForApproval', 'data.set']);

const isStepNode = ({ type }: GraphNodeUnion): boolean =>
  STEP_NODE_TYPES.has(type) || type.startsWith('elasticsearch.') || type.startsWith('kibana.');

const isCallNode = ({ type }: GraphNodeUnion): boolean =>
  type === 'workflow.execute' || type === 'workflow.executeAsync';

// Whether rendering `value` runs a template; the engine passes anything else through unchanged.
const hasTemplates = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(hasTemplates);
  }
  if (isRecord(value)) {
    return Object.values(value).some(hasTemplates);
  }
  return isTemplatedValue(value);
};

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
    const configuration = getConfiguration(node);
    const failure = steps.endStepFailure(configuration);
    // Rendering templated values can fail the step, which `on-failure` handlers catch, before it
    // ends the run.
    const renderEndings: Ending[] = hasTemplates(configuration.with) ? ['error'] : [];
    if (failure === 'mayFail') {
      return toOutcome(['completed', 'failed', ...renderEndings]);
    }
    return failure
      ? toOutcome(['failed', ...renderEndings], failure)
      : toOutcome(['completed', ...renderEndings]);
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
  const outcomes: Array<Outcome<Failure>> = [];
  for (const item of items) {
    if (!endings.has('next')) {
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const outcome = evaluate(item, steps);
    endings.delete('next');
    outcome.endings.forEach((ending) => endings.add(ending));
    outcomes.push(outcome);
  }
  return toOutcome(endings, outcomes[outcomes.length - 1]?.failure, outcomes);
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
  return toOutcome(endings, outcomes[0]?.failure, outcomes);
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
  const fallback = evaluate(fallbackPath, steps);
  fallback.endings.forEach((ending) => endings.add(ending === 'next' ? 'error' : ending));
  return toOutcome(endings, normal.failure, [normal, fallback]);
};

// The number of items a `foreach` loop goes over, when known before the run: the engine reads a
// literal list directly, and parses a string that isn't a template.
const countLiteralItems = (items: unknown): number | undefined => {
  if (Array.isArray(items)) {
    return items.length;
  }
  if (typeof items !== 'string' || isTemplatedValue(items)) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(items);
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    return undefined;
  }
};

// Iterations that end or leave early go on to the next one, or past the loop. A `while` loop runs
// its steps before checking its condition.
const evaluateLoop = <Failure>(region: Region, steps: StepFailures<Failure>): Outcome<Failure> => {
  const itemCount =
    region.node?.type === 'enter-foreach'
      ? countLiteralItems(getConfiguration(region.node).foreach)
      : 1;
  if (itemCount === 0) {
    return toOutcome(['next']);
  }
  const body = evaluateSequence(region.children, steps);
  const endings = new Set(body.endings);
  const leavesIteration = (['next', 'break', 'continue'] as const).filter((ending) =>
    endings.delete(ending)
  );
  const mayNotRun = itemCount === undefined;
  if (leavesIteration.length > 0 || mayNotRun) {
    endings.add('next');
  }
  return toOutcome(endings, body.failure, [body]);
};

const PARALLEL_BRANCH_ENDINGS: ReadonlySet<Ending> = new Set(['next', 'error', 'failed']);

// Every named branch runs, unless an earlier failure stops the rest; the single body of a dynamic
// step might run for no item. A failed step fails its branch, and the parallel step too unless it
// waits for every branch to settle. A `workflow.output` step that fails the run fails it from any
// branch; one that completes it (or a loop step) does something branches don't support yet.
const evaluateParallel = <Failure>(
  region: Region,
  steps: StepFailures<Failure>
): Outcome<Failure> => {
  if (!region.branches) {
    return UNKNOWN;
  }
  const outcomes = region.branches.map((branch) => evaluateSequence(branch, steps));
  if (
    outcomes.some(
      ({ endings, unknown }) =>
        unknown || [...endings].some((ending) => !PARALLEL_BRANCH_ENDINGS.has(ending))
    )
  ) {
    return UNKNOWN;
  }
  const settles = getConfiguration(region.node as GraphNodeUnion).mode === 'settled';
  const branchGoesOn = ({ endings }: Outcome<Failure>) =>
    endings.has('next') || (settles && endings.has('error'));
  const endings = new Set<Ending>();
  if (!getField(region.node, 'branches') || outcomes.every(branchGoesOn)) {
    endings.add('next');
  }
  if (outcomes.some(({ endings: branchEndings }) => branchEndings.has('failed'))) {
    endings.add('failed');
  }
  if (!settles && outcomes.some(({ endings: branchEndings }) => branchEndings.has('error'))) {
    endings.add('error');
  }
  const failing = outcomes.find((outcome) => !branchGoesOn(outcome));
  return toOutcome(endings, failing?.failure, outcomes);
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
      return toOutcome(endings, body.failure, [body]);
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

/** Returned when the analysis can't tell whether every run of a workflow fails. */
export const UNSUPPORTED_RUN = 'unsupported';

/**
 * The failure every run of the workflow reaches first, when every run fails: given `steps`, no
 * path through its compiled graph completes. Undefined when a run might complete, and
 * `UNSUPPORTED_RUN` when the workflow doesn't compile, or a run might reach steps the analysis
 * doesn't know how they end.
 */
export const findAlwaysFailure = <Failure>(
  definition: unknown,
  steps: StepFailures<Failure>
): Failure | typeof UNSUPPORTED_RUN | undefined => {
  const regions = getRegions(definition);
  if (!regions) {
    return UNSUPPORTED_RUN;
  }
  const { failure, unknown } = evaluate(regions, steps);
  return failure ?? (unknown ? UNSUPPORTED_RUN : undefined);
};

// Every step might fail, and `workflow.output` steps end the run as their status says.
const UNKNOWN_STEPS: StepFailures<true> = {
  callFailure: () => undefined,
  endStepFailure: ({ status = 'completed' }) => {
    if (status === 'completed') {
      return undefined;
    }
    return status === 'failed' || status === 'cancelled' ? true : 'mayFail';
  },
};

/**
 * Whether every run of the workflow ends in a `workflow.output` (or `workflow.fail`) step, or
 * fails. Otherwise a run can complete without one, and callers get its last step's output. False
 * when the workflow doesn't compile into a graph whose every node is known here.
 */
export const alwaysEndsInOutputStep = (definition: unknown): boolean => {
  const regions = getRegions(definition);
  if (!regions) {
    return false;
  }
  const { endings } = evaluate(regions, UNKNOWN_STEPS);
  return [...endings].every((ending) => ending === 'completed' || FAILURES.has(ending));
};

const collectOutputSteps = (region: Region): Array<Record<string, unknown>> =>
  region.children.flatMap((child) => {
    if (isRegion(child)) {
      return collectOutputSteps(child);
    }
    return child.node.type === 'workflow.output' ? [getConfiguration(child.node)] : [];
  });

/**
 * The `workflow.output` steps a run might reach (`workflow.fail` compiles to one with status
 * `failed`), including fallbacks: all of them when a run might reach steps the analysis doesn't
 * know how they end, and undefined when the workflow doesn't compile.
 */
export const getOutputSteps = (definition: unknown): Array<Record<string, unknown>> | undefined => {
  const regions = getRegions(definition);
  if (!regions) {
    return undefined;
  }
  const reached = new Set<Record<string, unknown>>();
  const { unknown } = evaluate(regions, {
    ...UNKNOWN_STEPS,
    endStepFailure: (step) => {
      reached.add(step);
      return UNKNOWN_STEPS.endStepFailure(step);
    },
  });
  return unknown ? collectOutputSteps(regions) : [...reached];
};

/**
 * The `with` maps of the completing `workflow.output` steps a run might reach; of every one in the
 * definition when the workflow doesn't compile.
 */
export const getCompletingOutputBlocks = (definition: unknown): Array<Record<string, unknown>> => {
  const steps = getOutputSteps(definition);
  if (!steps) {
    return collectWorkflowOutputBlocks(definition);
  }
  return steps
    .filter(isCompletingOutputStep)
    .map(({ with: values }) => values)
    .filter(isRecord);
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
