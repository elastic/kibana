/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  EsWorkflowStepExecution,
  LegacyWorkflowInput,
  StepContext,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { StepContextSchema } from '@kbn/workflows';
import {
  extractSchemaPropertyPaths,
  findInputsInGraph,
  parseJsPropertyAccess,
} from '@kbn/workflows/common/utils';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import {
  applyInputDefaults,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { z } from '@kbn/zod/v4';
import { INPUT_STRING_PLACEHOLDER } from '../../../../common/consts/placeholders';

export interface ContextOverrideData {
  stepContext: Partial<StepContext>;
  schema: z.ZodType;
  /** Original JSON Schema (avoids lossy Zod → JSON Schema round-trip for Monaco validation) */
  rawJsonSchema?: JsonModelSchemaType;
}

export interface StaticContextData extends Pick<StepContext, 'consts' | 'workflow'> {
  /**
   * Workflow inputs definition with their default values.
   * Used to pre-populate input fields in the test step modal.
   * Can be either legacy array format (LegacyWorkflowInput[]) or JSON Schema format.
   */
  inputsDefinition?: LegacyWorkflowInput[] | JsonModelSchemaType;
}

const StepContextSchemaPropertyPaths = extractSchemaPropertyPaths(StepContextSchema);

function buildStepContextSchemaFromObject(obj: any): z.ZodType {
  if (Array.isArray(obj)) {
    return z.array(buildStepContextSchemaFromObject(obj[0]));
  } else if (typeof obj === 'object' && obj !== null) {
    const config: Record<string, any> = {};

    Object.keys(obj).forEach((key) => {
      config[key] = buildStepContextSchemaFromObject(obj[key]);
    });

    return z.object(config).strict();
  }

  // z.any() accepts undefined, so without nonoptional() required keys would not be enforced.
  return z.any().nonoptional();
}

function readPropertyRecursive(
  propertyPath: string[],
  object: Record<string, unknown> | null | undefined
): unknown {
  if (typeof object === 'object' && object !== null && propertyPath.length) {
    const currentProp = propertyPath[0] as string;
    return readPropertyRecursive(
      propertyPath.slice(1),
      object[currentProp] as Record<string, unknown>
    );
  }

  return object;
}

/**
 * Build inputs object from workflow input definitions with their default values.
 * This allows the test step modal to pre-populate input fields with defined defaults.
 * Supports both legacy array format and new JSON Schema format.
 * Uses the same logic as the exec modal to ensure consistency.
 */
function buildInputsFromDefinition(
  inputsDefinition: LegacyWorkflowInput[] | JsonModelSchemaType | undefined
): Record<string, unknown> | undefined {
  if (!inputsDefinition) {
    return undefined;
  }

  // Normalize inputs to JSON Schema format (handles both legacy array and JSON Schema formats)
  const normalizedInputs = normalizeFieldsToJsonSchema(inputsDefinition);

  if (!normalizedInputs) {
    return undefined;
  }

  // Use applyInputDefaults to get defaults with $ref resolution and nested object support
  // This ensures the same behavior as the exec modal and handles all JSON Schema features
  const defaults = applyInputDefaults(undefined, normalizedInputs);

  return defaults;
}

export function buildContextOverride(
  workflowGraph: WorkflowGraph,
  staticData: StaticContextData
): ContextOverrideData {
  const contextOverride = {} as Record<string, any>;
  const inputsInGraph = findInputsInGraph(workflowGraph);
  const allInputs = Object.values(inputsInGraph).flat();
  const allInputsFiltered = allInputs.filter((input) =>
    StepContextSchemaPropertyPaths.some((schemaPropertyPath) =>
      input.startsWith(schemaPropertyPath.path)
    )
  );
  const inputsParsed = allInputsFiltered.map((input) => parseJsPropertyAccess(input));

  // Build the static data with inputs defaults for lookup
  const staticDataWithInputs = {
    ...staticData,
    inputs: buildInputsFromDefinition(staticData.inputsDefinition),
  };

  inputsParsed.forEach((pathParts) => {
    let current = contextOverride;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLastPart = i === pathParts.length - 1;

      if (isLastPart) {
        // Set a default value for the final property
        current[part] =
          current[part] ||
          readPropertyRecursive(pathParts.slice(0, i + 1), staticDataWithInputs) ||
          INPUT_STRING_PLACEHOLDER;
      } else {
        // Create nested object if it doesn't exist
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });

  const schema = buildStepContextSchemaFromObject(contextOverride);
  return {
    stepContext: contextOverride,
    schema,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Return a plain object from a value, or empty object if not a plain object */
function asPlainObject(value: unknown): Record<string, unknown> {
  if (isPlainObject(value)) {
    return value;
  }
  return {};
}

/**
 * Merge contextOverride onto base lookup: for each key in override, merge object values
 * (base + override) or set primitive values. Matches execution engine's enrichStepContextWithMockedData.
 */
function mergeContextOverride(
  base: Record<string, unknown>,
  contextOverride: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!contextOverride || typeof contextOverride !== 'object') {
    return base;
  }
  const result = { ...base };
  for (const key of Object.keys(contextOverride)) {
    const overrideVal = contextOverride[key];
    if (overrideVal !== undefined) {
      const baseVal = result[key];
      if (isPlainObject(overrideVal)) {
        result[key] = { ...asPlainObject(baseVal), ...overrideVal };
      } else {
        result[key] = overrideVal;
      }
    }
  }
  return result;
}

/** Extract items array from a foreach step execution's input */
function getForeachItemsFromStepInput(input: WorkflowStepExecutionDto['input']): unknown[] {
  if (!isPlainObject(input) || !('foreach' in input)) {
    return [];
  }
  const foreachVal = (input as { foreach: unknown }).foreach;
  return Array.isArray(foreachVal) ? foreachVal : [];
}

/**
 * Build foreach context for the target step from its scope stack and the foreach step execution.
 * Returns undefined if the step is not inside a foreach.
 */
function buildForeachContextFromExecution(
  targetStepExecution: WorkflowStepExecutionDto,
  stepExecutions: WorkflowStepExecutionDto[]
): { items: unknown[]; item: unknown; index: number; total: number } | undefined {
  const scopeStack = targetStepExecution.scopeStack ?? [];
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    const frame = scopeStack[i];
    const foreachScope = frame.nestedScopes?.find((s) => s.nodeType === 'enter-foreach');
    if (foreachScope) {
      const foreachStepExec = stepExecutions.find(
        (s) => s.stepId === frame.stepId && s.stepType === 'foreach'
      );
      if (foreachStepExec) {
        const items = getForeachItemsFromStepInput(foreachStepExec.input);
        const state = foreachStepExec.state ?? {};
        const total = typeof state.total === 'number' ? state.total : items.length;
        const rawIndex = parseInt(String(foreachScope.scopeId ?? '0'), 10) || 0;
        const index = Math.min(total - 1, Math.max(0, rawIndex));
        return {
          items,
          item: items[index],
          index,
          total,
        };
      }
    }
  }
  return undefined;
}

/**
 * Build a lookup object from workflow execution data that mirrors StepContext shape.
 * Used by buildContextOverrideFromExecution so readPropertyRecursive can resolve
 * template variable paths to historical values.
 */
function buildExecutionLookupData(
  workflowExecution: WorkflowExecutionDto,
  targetStepExecution: WorkflowStepExecutionDto
): Record<string, unknown> {
  const ctx = workflowExecution.context ?? {};
  const stepExecutions = workflowExecution.stepExecutions ?? [];
  const targetIndex = targetStepExecution.globalExecutionIndex;

  const stepsWithGix: Record<
    string,
    { input?: unknown; output?: unknown; error?: unknown; _gix: number }
  > = {};
  for (const se of stepExecutions) {
    if (se.globalExecutionIndex >= targetIndex) {
      // skip step executions that ran after the target step
    } else {
      const stepId = se.stepId;
      const existing = stepsWithGix[stepId];
      if (!existing || se.globalExecutionIndex > existing._gix) {
        stepsWithGix[stepId] = {
          input: se.input,
          output: se.output,
          error: se.error,
          _gix: se.globalExecutionIndex,
        };
      }
    }
  }
  const steps: Record<string, { input?: unknown; output?: unknown; error?: unknown }> = {};
  for (const [stepId, entry] of Object.entries(stepsWithGix)) {
    steps[stepId] = { input: entry.input, output: entry.output, error: entry.error };
  }

  const foreachCtx = buildForeachContextFromExecution(targetStepExecution, stepExecutions);

  const variables: Record<string, unknown> = {};
  const dataSetSteps = stepExecutions
    .filter(
      (s) => s.stepType === 'data.set' && s.globalExecutionIndex < targetIndex && s.output != null
    )
    .sort((a, b) => a.globalExecutionIndex - b.globalExecutionIndex);
  for (const se of dataSetSteps) {
    if (typeof se.output === 'object' && se.output !== null && !Array.isArray(se.output)) {
      Object.assign(variables, se.output);
    }
  }

  const base: Record<string, unknown> = {
    inputs: asPlainObject(ctx.inputs),
    workflow: asPlainObject(ctx.workflow),
    execution: asPlainObject(ctx.execution),
    consts: asPlainObject(ctx.consts),
    event: asPlainObject(ctx.event),
    kibanaUrl: ctx.kibanaUrl,
    steps: { ...steps },
  };
  if (foreachCtx) {
    base.foreach = foreachCtx;
  }
  if (Object.keys(variables).length > 0) {
    base.variables = variables;
  }

  const contextOverride = ctx.contextOverride as Record<string, unknown> | undefined;
  return mergeContextOverride(base, contextOverride);
}

/**
 * Reconstruct context override from historical workflow execution and step execution data.
 * Uses the current step definition's template variables (from the graph) and looks up
 * their values from the execution data so the user can replay a step with the same context.
 */
export function buildContextOverrideFromExecution(
  workflowGraph: WorkflowGraph,
  workflowExecution: WorkflowExecutionDto,
  targetStepExecution: EsWorkflowStepExecution
): ContextOverrideData {
  const contextOverride = {} as Record<string, any>;
  const inputsInGraph = findInputsInGraph(workflowGraph);
  const allInputs = Object.values(inputsInGraph).flat();
  const allInputsFiltered = allInputs.filter((input) =>
    StepContextSchemaPropertyPaths.some((schemaPropertyPath) =>
      input.startsWith(schemaPropertyPath.path)
    )
  );
  const inputsParsed = allInputsFiltered.map((input) => parseJsPropertyAccess(input));

  const lookupData = buildExecutionLookupData(workflowExecution, targetStepExecution);

  inputsParsed.forEach((pathParts) => {
    let current = contextOverride;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLastPart = i === pathParts.length - 1;

      if (isLastPart) {
        const value = readPropertyRecursive(pathParts.slice(0, i + 1), lookupData);
        current[part] = current[part] ?? value ?? INPUT_STRING_PLACEHOLDER;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });

  const schema = buildStepContextSchemaFromObject(contextOverride);

  return {
    stepContext: contextOverride,
    schema,
  };
}
