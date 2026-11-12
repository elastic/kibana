/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDynamicValue, isRecord } from '@kbn/workflows-yaml';
import type { WorkflowCallSite, WorkflowExecuteStepType } from './types';
import { WORKFLOW_EXECUTE_TYPES, WORKFLOW_REFERENCE_KEY } from '../import';
import { createStepOutputPattern } from '../step_output_pattern';

/** True for values rendered at runtime (`{{ }}`, `{% %}` or `${{ }}`), which cannot be checked statically. */
export const isTemplatedValue = (value: unknown): boolean =>
  typeof value === 'string' &&
  (value.includes('{{') || value.includes('{%') || isDynamicValue(value));

/** True for `{{ }}` / `{% %}` templates, which always render to a string; `${{ }}` keeps the type. */
export const isTextTemplate = (value: unknown): boolean =>
  isTemplatedValue(value) && !isDynamicValue(value);

const getSteps = (definition: unknown): unknown =>
  isRecord(definition) ? definition.steps : undefined;

const continuesOnFailure = (onFailure: unknown): boolean => {
  if (!isRecord(onFailure)) {
    return false;
  }
  const { continue: shouldContinue } = onFailure;
  // A templated `continue` is decided while running; treat it as continuing so that failures are
  // never reported as spreading further than they might.
  return (
    shouldContinue === true ||
    (typeof shouldContinue === 'string' &&
      shouldContinue.trim() !== '' &&
      shouldContinue !== 'false')
  );
};

const toCallSite = (
  step: Record<string, unknown>,
  isContained: boolean
): WorkflowCallSite | undefined => {
  const { type, name, with: withBlock } = step;
  if (typeof type !== 'string' || !WORKFLOW_EXECUTE_TYPES.has(type) || !isRecord(withBlock)) {
    return undefined;
  }
  const workflowId = withBlock[WORKFLOW_REFERENCE_KEY];
  if (typeof workflowId !== 'string' || workflowId.length === 0 || isTemplatedValue(workflowId)) {
    return undefined;
  }
  const { inputs } = withBlock;
  return {
    workflowId,
    stepName: typeof name === 'string' ? name : '',
    stepType: type as WorkflowExecuteStepType,
    inputs: isRecord(inputs) ? inputs : undefined,
    isDynamicInputs: isTemplatedValue(inputs),
    continuesOnFailure: isContained,
  };
};

type StepVisitor = (step: Record<string, unknown>, isContained: boolean) => void;

// Walks every nested step container (steps, else, cases, branches, on-failure, ...) without
// descending into `with`, where step-shaped objects are data rather than steps. `isContained`
// tracks whether an `on-failure: continue` on the step or an enclosing one absorbs its failure.
const walkSteps = (node: unknown, visit: StepVisitor, isContained: boolean): void => {
  if (Array.isArray(node)) {
    node.forEach((child) => walkSteps(child, visit, isContained));
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  let childrenContained = isContained;
  if (typeof node.type === 'string') {
    const isStepContained = isContained || continuesOnFailure(node['on-failure']);
    visit(node, isStepContained);
    childrenContained = isStepContained || continuesOnFailure(node['iteration-on-failure']);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'with') {
      walkSteps(value, visit, childrenContained);
    }
  }
};

const walkDefinitionSteps = (definition: unknown, visit: StepVisitor): void => {
  const settings = isRecord(definition) ? definition.settings : undefined;
  walkSteps(
    getSteps(definition),
    visit,
    isRecord(settings) && continuesOnFailure(settings['on-failure'])
  );
};

/** Returns every static `workflow.execute` / `workflow.executeAsync` call in a workflow definition. */
export const collectWorkflowCallSites = (definition: unknown): WorkflowCallSite[] => {
  const callSites: WorkflowCallSite[] = [];
  walkDefinitionSteps(definition, (step, isContained) => {
    const callSite = toCallSite(step, isContained);
    if (callSite) {
      callSites.push(callSite);
    }
  });
  return callSites;
};

/** Returns the distinct IDs of the workflows a definition runs with a static `workflow-id`. */
export const getCalledWorkflowIds = (definition: unknown): string[] => [
  ...new Set(collectWorkflowCallSites(definition).map(({ workflowId }) => workflowId)),
];

/** Collects the `with` maps of every `workflow.output` step in a workflow definition. */
export const collectWorkflowOutputBlocks = (
  definition: unknown
): Array<Record<string, unknown>> => {
  const blocks: Array<Record<string, unknown>> = [];
  walkDefinitionSteps(definition, (step) => {
    if (step.type === 'workflow.output' && isRecord(step.with)) {
      blocks.push(step.with);
    }
  });
  return blocks;
};

/**
 * Returns the output names set by the workflow's `workflow.output` steps, or undefined when that
 * can't be known statically (no such step, or one whose `with` is a single template expression).
 */
export const collectReturnedOutputNames = (definition: unknown): Set<string> | undefined => {
  const names = new Set<string>();
  let isKnown = false;
  let hasDynamicBlock = false;
  walkDefinitionSteps(definition, (step) => {
    if (step.type !== 'workflow.output') {
      return;
    }
    isKnown = true;
    if (!isRecord(step.with)) {
      hasDynamicBlock = true;
      return;
    }
    Object.keys(step.with).forEach((name) => names.add(name));
  });
  return isKnown && !hasDynamicBlock ? names : undefined;
};

const MAX_FALLBACK_LOOKAHEAD = 200;
// The rest of the expression after the reference: up to the closing `}}` / `%}` or the end of
// the (JSON-serialized) string that holds it.
const EXPRESSION_END = /\}\}|%\}|(?<!\\)"/;
const DEFAULT_FILTER = /\|\s*default\s*:/;

export interface OutputUsage {
  /** Top-level output field; empty string when the whole output object is referenced. */
  field: string;
  /** True when every reference passes through a `| default:` filter, so a missing value is replaced. */
  hasFallback: boolean;
}

const findOutputUsagesIn = (serialized: string, stepName: string): OutputUsage[] => {
  const usages = new Map<string, boolean>();
  for (const match of serialized.matchAll(createStepOutputPattern(stepName))) {
    const field = match[1] ?? match[2] ?? '';
    const rest = serialized.slice(
      (match.index ?? 0) + match[0].length,
      (match.index ?? 0) + match[0].length + MAX_FALLBACK_LOOKAHEAD
    );
    const endIndex = rest.search(EXPRESSION_END);
    const expressionRest = endIndex === -1 ? rest : rest.slice(0, endIndex);
    const hasFallback = DEFAULT_FILTER.test(expressionRest);
    usages.set(field, (usages.get(field) ?? true) && hasFallback);
  }
  return [...usages].map(([field, hasFallback]) => ({ field, hasFallback }));
};

/**
 * Returns the top-level output fields a workflow reads from a step via
 * `steps.<stepName>.output.<field>` (dot or bracket notation).
 */
export const findOutputUsages = (definition: unknown, stepName: string): OutputUsage[] =>
  stepName ? findOutputUsagesIn(JSON.stringify(getSteps(definition) ?? []), stepName) : [];

/**
 * Returns the names of the workflow's own outputs (`workflow.output` keys) whose values read the
 * given step outputs without a fallback. A read with no `field` stands for every output of the step.
 */
export const findOutputsPassingThrough = (
  definition: unknown,
  reads: ReadonlyArray<{ stepName: string; field?: string }>
): Set<string> => {
  const passedThrough = new Set<string>();
  for (const block of collectWorkflowOutputBlocks(definition)) {
    for (const [outputName, value] of Object.entries(block)) {
      const serialized = JSON.stringify(value ?? null);
      const isAffected = reads.some(({ stepName, field }) =>
        findOutputUsagesIn(serialized, stepName).some(
          (usage) =>
            !usage.hasFallback &&
            (field === undefined || usage.field === '' || usage.field === field)
        )
      );
      if (isAffected) {
        passedThrough.add(outputName);
      }
    }
  }
  return passedThrough;
};
