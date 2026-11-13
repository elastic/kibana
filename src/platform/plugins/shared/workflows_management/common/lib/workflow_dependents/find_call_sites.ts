/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Output } from 'liquidjs';
import { isEqual } from 'lodash';
import { getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { getNestedStepGroups, type WorkflowStep } from '@kbn/workflows';
import { createWorkflowLiquidEngine, extractTemplateVariables } from '@kbn/workflows/common/utils';
import { parsePath } from '@kbn/workflows/common/utils/zod';
import { isDynamicValue, isRecord } from '@kbn/workflows-yaml';
import type { WorkflowCallSite, WorkflowExecuteStepType } from './types';
import { WORKFLOW_EXECUTE_TYPES, WORKFLOW_REFERENCE_KEY } from '../import';

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
  { isContained, isConditional }: StepContext
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
    isConditional,
  };
};

interface StepContext {
  /** True when an `on-failure: continue` on the step or an enclosing one absorbs its failure. */
  isContained: boolean;
  /** True when the step might not run: it has an `if`, or sits in a branch, loop or fallback. */
  isConditional: boolean;
}

type StepVisitor = (step: Record<string, unknown>, context: StepContext) => void;

const isWorkflowStep = (node: unknown): node is WorkflowStep =>
  isRecord(node) && typeof node.type === 'string';

// Nested steps that run whenever their parent does; other containers may skip theirs.
const alwaysRunsNestedSteps = (step: WorkflowStep, pathSuffix: string): boolean =>
  step.type === 'merge' || (step.type === 'parallel' && pathSuffix.startsWith('.branch['));

const walkSteps = (steps: unknown, visit: StepVisitor, parentContext: StepContext): void => {
  if (!Array.isArray(steps)) {
    return;
  }
  for (const step of steps.filter(isWorkflowStep)) {
    const record: Record<string, unknown> = step;
    const context: StepContext = {
      isContained: parentContext.isContained || continuesOnFailure(record['on-failure']),
      isConditional: parentContext.isConditional || record.if !== undefined,
    };
    visit(record, context);
    const isContainedInside =
      context.isContained || continuesOnFailure(record['iteration-on-failure']);
    for (const { pathSuffix, steps: nestedSteps } of getNestedStepGroups(step)) {
      walkSteps(nestedSteps, visit, {
        isContained: isContainedInside,
        isConditional: context.isConditional || !alwaysRunsNestedSteps(step, pathSuffix),
      });
    }
  }
};

const getWorkflowOnFailure = (definition: unknown): unknown =>
  isRecord(definition) && isRecord(definition.settings)
    ? definition.settings['on-failure']
    : undefined;

// The workflow's steps, then the fallback steps its `settings.on-failure` runs when it fails.
const walkDefinitionSteps = (definition: unknown, visit: StepVisitor): void => {
  const onFailure = getWorkflowOnFailure(definition);
  const isContained = continuesOnFailure(onFailure);
  walkSteps(getSteps(definition), visit, { isContained, isConditional: false });
  walkSteps(isRecord(onFailure) ? onFailure.fallback : undefined, visit, {
    isContained,
    isConditional: true,
  });
};

/** Returns every static `workflow.execute` / `workflow.executeAsync` call in a workflow definition. */
export const collectWorkflowCallSites = (definition: unknown): WorkflowCallSite[] => {
  const callSites: WorkflowCallSite[] = [];
  walkDefinitionSteps(definition, (step, context) => {
    const callSite = toCallSite(step, context);
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

// Callers only get the output of a run that completes; `failed` and `cancelled` fail the call.
const isCompletingOutputStep = (step: Record<string, unknown>): boolean =>
  step.type === 'workflow.output' && (step.status === undefined || step.status === 'completed');

/** Collects the `with` maps of every completing `workflow.output` step in a workflow definition. */
export const collectWorkflowOutputBlocks = (
  definition: unknown
): Array<Record<string, unknown>> => {
  const blocks: Array<Record<string, unknown>> = [];
  walkDefinitionSteps(definition, (step) => {
    if (isCompletingOutputStep(step) && isRecord(step.with)) {
      blocks.push(step.with);
    }
  });
  return blocks;
};

export const hasWorkflowOutputStep = (definition: unknown): boolean => {
  let found = false;
  walkDefinitionSteps(definition, (step) => {
    found = found || isCompletingOutputStep(step);
  });
  return found;
};

/**
 * Returns the output names set by the workflow's completing `workflow.output` steps, or undefined
 * when that can't be known statically (no such step, or one whose `with` is a template expression).
 */
export const collectReturnedOutputNames = (definition: unknown): Set<string> | undefined => {
  const names = new Set<string>();
  let isKnown = false;
  let hasDynamicBlock = false;
  walkDefinitionSteps(definition, (step) => {
    if (!isCompletingOutputStep(step)) {
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

export interface OutputUsage {
  /** Top-level output field; empty string when the whole output object is referenced. */
  field: string;
  /** True when every reference passes through a `| default:` filter, so a missing value is replaced. */
  hasFallback: boolean;
}

interface VariableRead {
  path: readonly string[];
  hasFallback: boolean;
}

// KQL expressions, where variables are referenced by bare field names.
const CONDITION_KEYS = new Set(['if', 'condition']);

const liquid = createWorkflowLiquidEngine({ strictFilters: false, strictVariables: false });

const extractVariables = (template: string): string[] => {
  try {
    return extractTemplateVariables(template);
  } catch {
    // A template that doesn't parse fails when it runs, before reading anything.
    return [];
  }
};

const toReads = (variables: readonly string[], hasFallback: boolean): VariableRead[] =>
  variables.flatMap((variable) => {
    const path = parsePath(variable);
    return path ? [{ path, hasFallback }] : [];
  });

const parseTemplate = (template: string): ReturnType<typeof liquid.parse> | undefined => {
  try {
    return liquid.parse(template);
  } catch {
    return undefined;
  }
};

/**
 * Reads in a Liquid template. A read has a fallback when it is the value of a `{{ }}` output with
 * a `default` filter; reads in tags, in filter arguments and in other outputs have none.
 */
const readsInTemplate = (template: string): VariableRead[] => {
  const templates = parseTemplate(template);
  if (!templates) {
    return [];
  }
  const withFallback: string[] = [];
  const withoutFallback: string[] = [];
  let rest = '';
  let restStart = 0;
  for (const node of templates) {
    if (node instanceof Output && node.value.filters.some(({ name }) => name === 'default')) {
      const { begin, end } = node.token;
      rest += template.slice(restStart, begin);
      restStart = end;
      const { postfix } = node.value.initial;
      const valuePath = postfix.length === 1 ? parsePath(postfix[0].getText()) : null;
      for (const variable of extractVariables(template.slice(begin, end))) {
        (isEqual(parsePath(variable), valuePath) ? withFallback : withoutFallback).push(variable);
      }
    }
  }
  rest += template.slice(restStart);
  return [
    ...toReads(withFallback, true),
    ...toReads([...withoutFallback, ...extractVariables(rest)], false),
  ];
};

const readsInCondition = (condition: string): VariableRead[] => {
  try {
    return toReads(getKqlFieldNamesFromExpression(condition), false);
  } catch {
    return [];
  }
};

const collectReads = (value: unknown, key?: string): VariableRead[] => {
  if (typeof value === 'string') {
    const reads = value.includes('{{') || value.includes('{%') ? readsInTemplate(value) : [];
    return key !== undefined && CONDITION_KEYS.has(key)
      ? [...reads, ...readsInCondition(value)]
      : reads;
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectReads(item));
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([childKey, child]) => collectReads(child, childKey));
  }
  return [];
};

const toOutputUsages = (reads: readonly VariableRead[], stepName: string): OutputUsage[] => {
  const usages = new Map<string, boolean>();
  for (const { path, hasFallback } of reads) {
    if (path[0] === 'steps' && path[1] === stepName && path[2] === 'output') {
      const field = path[3] ?? '';
      usages.set(field, (usages.get(field) ?? true) && hasFallback);
    }
  }
  return [...usages].map(([field, hasFallback]) => ({ field, hasFallback }));
};

const definitionReadsCache = new WeakMap<object, readonly VariableRead[]>();

const getDefinitionReads = (definition: unknown): readonly VariableRead[] => {
  if (!isRecord(definition)) {
    return [];
  }
  const cached = definitionReadsCache.get(definition);
  if (cached) {
    return cached;
  }
  const onFailure = getWorkflowOnFailure(definition);
  const reads = collectReads([
    definition.steps,
    isRecord(onFailure) ? onFailure.fallback : undefined,
  ]);
  definitionReadsCache.set(definition, reads);
  return reads;
};

/**
 * Returns the top-level output fields a workflow reads from a step via
 * `steps.<stepName>.output.<field>`, in Liquid templates and KQL conditions.
 */
export const findOutputUsages = (definition: unknown, stepName: string): OutputUsage[] =>
  stepName ? toOutputUsages(getDefinitionReads(definition), stepName) : [];

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
      const valueReads = collectReads(value);
      const isAffected = reads.some(({ stepName, field }) =>
        toOutputUsages(valueReads, stepName).some(
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
