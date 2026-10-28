/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { z } from '@kbn/zod/v4';
import {
  DataSetStepSchema,
  IfStepSchema,
  LoopBreakStepSchema,
  LoopContinueStepSchema,
  WaitForApprovalStepSchema,
  WhileStepSchema,
  WorkflowExecuteStepSchema,
  WorkflowOutputStepSchema,
} from '../../../spec/schema';

/**
 * Shared by the shape tests of the proposal gate (`create_proposal.test.ts`) and of the child it
 * resolves each answer in (`resolve_proposal.test.ts`), which assert on the raw YAML.
 */

/** Local shape: the parsed YAML is untyped, and only these fields are asserted on. */
export interface WorkflowStep {
  name?: string;
  type?: string;
  condition?: string;
  if?: string;
  timeout?: string;
  /** A `workflow.output` step's terminal status. */
  status?: string;
  'on-failure'?: {
    continue?: boolean | string;
    fallback?: WorkflowStep[];
    retry?: { 'max-attempts'?: number; delay?: string; condition?: string };
  };
  'max-iterations'?: number | { limit?: number; 'on-limit'?: string };
  'iteration-timeout'?: string;
  with?: Record<string, unknown>;
  steps?: WorkflowStep[];
  /** An `if` step's false branch. Every traversal below has to include it. */
  else?: WorkflowStep[];
}

export interface ParsedWorkflow {
  consts?: Record<string, unknown>;
  settings?: {
    timeout?: string;
    'on-failure'?: { fallback?: WorkflowStep[] };
  };
  triggers: Array<{
    type: string;
    inputs?: {
      properties?: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  }>;
  outputs?: Array<{ name: string; type: string }>;
  steps: WorkflowStep[];
}

export const parseWorkflow = (yaml: string): ParsedWorkflow => parse(yaml) as ParsedWorkflow;

/** Both branches of a step, so nothing in an `else` escapes these assertions. */
export const childrenOf = (step: WorkflowStep): WorkflowStep[] => [
  ...(step.steps ?? []),
  ...(step.else ?? []),
];

export const findStep = (steps: WorkflowStep[], name: string): WorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) {
      return step;
    }
    const match = findStep(childrenOf(step), name);
    if (match) {
      return match;
    }
  }
  return undefined;
};

/** Every descendant of a step, so containment can be asserted. */
export const collectNames = (steps: WorkflowStep[]): string[] =>
  steps.flatMap((step) => [step.name ?? '', ...collectNames(childrenOf(step))]);

/** Every step in the definition, including the failure handler's fallback. */
export const allSteps = (workflow: ParsedWorkflow): WorkflowStep[] => {
  const flatten = (steps: WorkflowStep[]): WorkflowStep[] =>
    steps.flatMap((step) => [step, ...flatten(childrenOf(step))]);

  return [
    ...flatten(workflow.steps),
    ...flatten(workflow.settings?.['on-failure']?.fallback ?? []),
  ];
};

export const stepsOfType = (workflow: ParsedWorkflow, type: string): WorkflowStep[] =>
  allSteps(workflow).filter((step) => step.type === type);

/**
 * Mirrors `VALID_STATUSES` in the plugin's `proposals_service`. Duplicated
 * rather than imported because a package cannot depend on a plugin, and the
 * pairing rule is worth enforcing here: the service rejects an illegal pair at
 * runtime, which in a workflow means a failed execution rather than a type
 * error.
 */
export const VALID_STATUSES: Record<string, readonly string[]> = {
  undecided: ['pending', 'expired'],
  dismissed: ['no_action'],
  approved: ['no_action', 'executing', 'succeeded', 'failed'],
};

/**
 * The schemas the engine models built-in steps with. The custom `proposals.*`
 * steps are absent on purpose: this repo owns their schemas, so a key written
 * here is a key it declared.
 */
const BUILT_IN_STEP_SCHEMAS: Record<string, z.ZodType> = {
  'data.set': DataSetStepSchema,
  if: IfStepSchema,
  'loop.break': LoopBreakStepSchema,
  'loop.continue': LoopContinueStepSchema,
  waitForApproval: WaitForApprovalStepSchema,
  while: WhileStepSchema,
  'workflow.execute': WorkflowExecuteStepSchema,
  'workflow.output': WorkflowOutputStepSchema,
};

/**
 * A zod object drops a key it does not model rather than complaining, and
 * every other assertion over the raw YAML reads it as-is — so a step can
 * declare something no schema has heard of and still look wired.
 *
 * Managed workflows install under `lightweightValidation`, which does not
 * validate steps at all, so production neither rejects nor strips such a
 * key: whether it does anything is entirely up to the engine.
 */
export const unmodelledKeys = (workflow: ParsedWorkflow): string[] =>
  allSteps(workflow).flatMap((step) => {
    const schema = step.type ? BUILT_IN_STEP_SCHEMAS[step.type] : undefined;
    if (!schema) {
      return [];
    }
    const parsed = schema.safeParse(step);
    if (!parsed.success) {
      return [`${step.name} (${step.type}): does not satisfy its own schema`];
    }
    const modelled = new Set(Object.keys(parsed.data as object));
    return Object.keys(step)
      .filter((key) => !modelled.has(key))
      .map((key) => `${step.name} (${step.type}): ${key}`);
  });

/** Liquid has no operator precedence and no parentheses, so a mixed condition binds unpredictably. */
export const mixedConditions = (workflow: ParsedWorkflow): string[] =>
  allSteps(workflow)
    .map(({ condition }) => condition)
    .filter((condition): condition is string => typeof condition === 'string')
    .filter((condition) => condition.includes(' and ') && condition.includes(' or '));
