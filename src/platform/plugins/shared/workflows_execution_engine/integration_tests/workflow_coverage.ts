/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helpers for workflow tests built on `managed_workflow_harness`: reading the
 * YAML, and checking that the cases cover every step and branch of the workflow.
 */

import { parse } from 'yaml';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

export interface YamlStep {
  readonly name?: string;
  readonly type?: string;
  readonly if?: string;
  readonly steps?: readonly YamlStep[];
  readonly else?: readonly YamlStep[];
  readonly default?: readonly YamlStep[];
  readonly cases?: ReadonlyArray<{ readonly steps?: readonly YamlStep[] }>;
  readonly 'on-failure'?: {
    readonly fallback?: readonly YamlStep[];
    readonly continue?: boolean | string;
  };
  readonly with?: Readonly<Record<string, unknown>>;
}

export interface YamlWorkflow {
  readonly outputs?: ReadonlyArray<{ readonly name: string }>;
  readonly triggers?: ReadonlyArray<{
    readonly inputs?: { readonly properties?: Readonly<Record<string, JsonSchema>> };
  }>;
  readonly steps: readonly YamlStep[];
}

export interface JsonSchema {
  readonly enum?: readonly string[];
  readonly const?: string;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly oneOf?: readonly JsonSchema[];
  readonly [key: string]: unknown;
}

export interface ParsedWorkflow {
  readonly yaml: string;
  readonly definition: YamlWorkflow;
  /** Every step, nested ones included. */
  readonly steps: readonly YamlStep[];
  readonly stepNames: ReadonlySet<string>;
}

/** What a coverage check needs to know about one case run. A `ManagedWorkflowRun` is one. */
export interface CoveredRun {
  readonly executedStepIds: readonly string[];
  readonly failedStepIds: readonly string[];
}

const flattenSteps = (steps: readonly YamlStep[] = []): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps),
    ...flattenSteps(step.else),
    ...flattenSteps(step.default),
    ...(step.cases ?? []).flatMap(({ steps: caseSteps }) => flattenSteps(caseSteps)),
    ...flattenSteps(step['on-failure']?.fallback),
  ]);

/** The names of the given steps and of every step nested in them. */
export const stepNames = (steps: readonly YamlStep[] = []): string[] =>
  flattenSteps(steps).flatMap(({ name }) => (name ? [name] : []));

export const parseWorkflow = (yaml: string): ParsedWorkflow => {
  const definition = parse(yaml) as YamlWorkflow;
  return {
    yaml,
    definition,
    steps: flattenSteps(definition.steps),
    stepNames: new Set(stepNames(definition.steps)),
  };
};

/** The managed YAML as installed, so the test cannot drift from what ships. */
export const managedWorkflowYaml = (id: string): string => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${id} has no yaml`);
  }
  return definition.yaml;
};

/** A managed workflow as installed, parsed. */
export const managedWorkflow = (id: string): ParsedWorkflow =>
  parseWorkflow(managedWorkflowYaml(id));

export const findStep = ({ steps }: ParsedWorkflow, name: string): YamlStep => {
  const step = steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`The workflow has no step "${name}"`);
  }
  return step;
};

/** The JSON schema in `with.schema` of a step, for example the output schema of an `ai.agent` step. */
export const stepSchema = (workflow: ParsedWorkflow, stepName: string): JsonSchema => {
  const schema = findStep(workflow, stepName).with?.schema;
  if (!schema || typeof schema !== 'object') {
    throw new Error(`Step "${stepName}" declares no schema`);
  }
  return schema as JsonSchema;
};

/**
 * Checks a value against the schema in `with.schema` of a step. Uses the converter
 * that the workflow YAML validator uses for step output schemas.
 */
export const matchesStepSchema = (
  workflow: ParsedWorkflow,
  stepName: string
): ((value: unknown) => boolean) => {
  const schema = fromJSONSchema(stepSchema(workflow, stepName));
  if (!schema) {
    throw new Error(`The schema of step "${stepName}" cannot be converted`);
  }
  return (value) => schema.safeParse(value).success;
};

/**
 * The problems the engine finds when `workflow` starts with `inputs`, empty when it
 * accepts them. Uses the validator the engine runs before every workflow run.
 */
export const workflowInputErrors = (
  { definition }: ParsedWorkflow,
  inputs: Readonly<Record<string, unknown>>
): string[] => {
  const validator = buildFieldsZodValidator(
    getInputsFromDefinition(definition as Partial<WorkflowYaml>)
  );
  const result = validator.safeParse(inputs);
  return result.success
    ? []
    : result.error.issues.map(
        ({ path, message }) => `${['inputs', ...path].join('.')}: ${message}`
      );
};

/**
 * Declares the checks that the cases cover every branch of `workflow`: every step
 * runs, every `if:` condition is false once, every `if` step takes and skips its
 * branch, every `switch` without a default matches no case once, and every step
 * with `on-failure` fails once. A new step or branch without a case fails a check.
 */
export const describeBranchCoverage = (
  workflow: ParsedWorkflow,
  getRuns: () => readonly CoveredRun[]
): void => {
  const ran = (run: CoveredRun, names: readonly string[]) =>
    names.some((name) => run.executedStepIds.includes(name));

  describe('the cases cover every branch of the workflow', () => {
    it('runs every step in at least one case', () => {
      const neverRun = [...workflow.stepNames].filter(
        (name) => !getRuns().some((run) => run.executedStepIds.includes(name))
      );
      expect(neverRun).toEqual([]);
    });

    it('skips every step that has an `if:` condition in at least one case', () => {
      // The engine wraps a step that has `if:` in a step named `if_<name>`. The
      // wrapper runs and the step does not when the condition is false.
      const neverSkipped = workflow.steps
        .filter(({ name, if: condition }) => name && condition)
        .map(({ name }) => name as string)
        .filter(
          (name) =>
            !getRuns().some(
              (run) =>
                run.executedStepIds.includes(`if_${name}`) && !run.executedStepIds.includes(name)
            )
        );
      expect(neverSkipped).toEqual([]);
    });

    it('takes and skips the branch of every `if` step', () => {
      const untested = workflow.steps
        .filter(({ name, type }) => name && type === 'if')
        .flatMap(({ name, steps }) => {
          const branch = stepNames(steps);
          const taken = getRuns().some((run) => ran(run, branch));
          const skipped = getRuns().some(
            (run) => run.executedStepIds.includes(name as string) && !ran(run, branch)
          );
          return [
            ...(taken ? [] : [`${name}: branch never taken`]),
            ...(skipped ? [] : [`${name}: branch never skipped`]),
          ];
        });
      expect(untested).toEqual([]);
    });

    it('matches no case of every `switch` that has no default, in at least one case', () => {
      const neverUnmatched = workflow.steps
        .filter(({ name, type, default: fallback }) => name && type === 'switch' && !fallback)
        .filter(({ name, cases }) => {
          const caseSteps = (cases ?? []).flatMap(({ steps }) => stepNames(steps));
          return !getRuns().some(
            (run) => run.executedStepIds.includes(name as string) && !ran(run, caseSteps)
          );
        })
        .map(({ name }) => name);
      expect(neverUnmatched).toEqual([]);
    });

    it('fails every step that has `on-failure` in at least one case', () => {
      const neverFailed = workflow.steps
        .filter((step) => step.name && step['on-failure'])
        .map(({ name }) => name as string)
        .filter((name) => !getRuns().some((run) => run.failedStepIds.includes(name)));
      expect(neverFailed).toEqual([]);
    });
  });
};
