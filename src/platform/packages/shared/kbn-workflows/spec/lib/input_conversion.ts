/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type {
  WorkflowInputSchema,
  WorkflowInputStringSchema,
  WorkflowInputNumberSchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
  WorkflowInputArraySchema,
} from '../schema';
import { z } from '@kbn/zod';

type LegacyWorkflowInput =
  | z.infer<typeof WorkflowInputStringSchema>
  | z.infer<typeof WorkflowInputNumberSchema>
  | z.infer<typeof WorkflowInputBooleanSchema>
  | z.infer<typeof WorkflowInputChoiceSchema>
  | z.infer<typeof WorkflowInputArraySchema>;

type WorkflowInputWithJsonSchema = {
  name: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  type: 'json-schema';
  schema: JSONSchema7;
};

/**
 * Converts a legacy workflow input to JSON Schema format
 * @param input - The legacy input to convert
 * @returns The input in JSON Schema format
 */
export function convertLegacyInputToJsonSchema(
  input: LegacyWorkflowInput
): WorkflowInputWithJsonSchema {
  const base = {
    name: input.name,
    description: input.description,
    required: input.required,
    default: input.default,
  };

  switch (input.type) {
    case 'string': {
      return {
        ...base,
        type: 'json-schema',
        schema: { type: 'string' },
      };
    }
    case 'number': {
      return {
        ...base,
        type: 'json-schema',
        schema: { type: 'number' },
      };
    }
    case 'boolean': {
      return {
        ...base,
        type: 'json-schema',
        schema: { type: 'boolean' },
      };
    }
    case 'choice': {
      return {
        ...base,
        type: 'json-schema',
        schema: {
          type: 'string',
          enum: input.options,
        },
      };
    }
    case 'array': {
      const schema: JSONSchema7 = {
        type: 'array',
        items: {
          anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
      };
      if (input.minItems !== undefined) {
        schema.minItems = input.minItems;
      }
      if (input.maxItems !== undefined) {
        schema.maxItems = input.maxItems;
      }
      return {
        ...base,
        type: 'json-schema',
        schema,
      };
    }
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = input;
      throw new Error(`Unknown input type: ${(_exhaustive as LegacyWorkflowInput).type}`);
    }
  }
}

/**
 * Normalizes any workflow input to JSON Schema format
 * If the input is already in JSON Schema format, returns it as-is
 * @param input - The input to normalize
 * @returns The input in JSON Schema format
 */
export function normalizeInputToJsonSchema(
  input: z.infer<typeof WorkflowInputSchema>
): WorkflowInputWithJsonSchema {
  if (input.type === 'json-schema') {
    return input;
  }
  return convertLegacyInputToJsonSchema(input as LegacyWorkflowInput);
}

