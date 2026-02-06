/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { StepContext, WorkflowInput } from '@kbn/workflows';
import { StepContextSchema } from '@kbn/workflows';
import {
  extractSchemaPropertyPaths,
  findInputsInGraph,
  parseJsPropertyAccess,
} from '@kbn/workflows/common/utils';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';

export interface ContextOverrideData {
  stepContext: Partial<StepContext>;
  schema: z.ZodType;
}

export interface StaticContextData extends Pick<StepContext, 'consts' | 'workflow'> {
  /**
   * Workflow inputs definition with their default values.
   * Used to pre-populate input fields in the test step modal.
   */
  inputsDefinition?: WorkflowInput[];
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

  return z.any();
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
 */
function buildInputsFromDefinition(
  inputsDefinition: WorkflowInput[] | undefined
): Record<string, unknown> | undefined {
  if (!inputsDefinition || inputsDefinition.length === 0) {
    return undefined;
  }

  const inputs: Record<string, unknown> = {};
  for (const input of inputsDefinition) {
    if (input.default !== undefined) {
      inputs[input.name] = input.default;
    }
  }

  return Object.keys(inputs).length > 0 ? inputs : undefined;
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
          'replace with your data';
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
