/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepFailures as GraphStepFailures, UNSUPPORTED_RUN } from '@kbn/workflows/graph';
import {
  getOutputSteps,
  failureEscapes as graphFailureEscapes,
  findAlwaysFailure as graphFindAlwaysFailure,
} from '@kbn/workflows/graph';
import { isRecord } from '@kbn/workflows-yaml';
import {
  collectWorkflowOutputBlocks,
  getOutputStepNames,
  isCompletingOutputStep,
  toCallSite,
} from './find_call_sites';
import type { WorkflowCallSite } from './types';

/** What the analysis knows about the steps whose result it can tell, with calls read as call sites. */
export interface StepFailures<Failure> extends Omit<GraphStepFailures<Failure>, 'callFailure'> {
  /** The failure of a call that fails its step every time it runs, if it does. */
  callFailure: (callSite: WorkflowCallSite) => Failure | undefined;
}

const toGraphStepFailures = <Failure>({
  callFailure,
  endStepFailure,
}: StepFailures<Failure>): GraphStepFailures<Failure> => ({
  callFailure: (step) => {
    const callSite = toCallSite(step);
    return callSite && callFailure(callSite);
  },
  endStepFailure,
});

/** The failure every run of the workflow reaches first, when every run fails (see `@kbn/workflows/graph`). */
export const findAlwaysFailure = <Failure>(
  definition: unknown,
  steps: StepFailures<Failure>
): Failure | typeof UNSUPPORTED_RUN | undefined =>
  graphFindAlwaysFailure(definition, toGraphStepFailures(steps));

/** Whether a failure of the step `stepName` always fails the run (see `@kbn/workflows/graph`). */
export const failureEscapes = <Failure>(
  definition: unknown,
  stepName: string,
  steps: StepFailures<Failure>
): boolean => graphFailureEscapes(definition, stepName, toGraphStepFailures(steps));

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

/**
 * Names the completing `workflow.output` steps a run might reach set; undefined when one of them is
 * computed. Of every one in the definition when the workflow doesn't compile.
 */
export const getReachableOutputStepNames = (definition: unknown): string[] | undefined => {
  const steps = getOutputSteps(definition);
  if (!steps) {
    return getOutputStepNames(definition);
  }
  const blocks = steps.filter(isCompletingOutputStep).map(({ with: values }) => values);
  return blocks.every(isRecord)
    ? [...new Set(blocks.flatMap((values) => Object.keys(values)))]
    : undefined;
};
