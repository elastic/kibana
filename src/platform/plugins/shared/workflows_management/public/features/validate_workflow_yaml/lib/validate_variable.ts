/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows/spec/schema';
import { z } from '@kbn/zod/v4';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getSchemaAtPath } from '../../../../common/lib/zod';
import { getDetailedTypeDescription } from '../../../../common/lib/zod/zod_type_description';
import { InvalidForeachParameterError } from '../../workflow_context/lib/errors';
import { getForeachItemSchema } from '../../workflow_context/lib/get_foreach_state_schema';
import type { VariableItem, YamlValidationResult } from '../model/types';

export function validateVariable(
  variableItem: VariableItem,
  context: typeof DynamicStepContextSchema | null
): YamlValidationResult {
  const { key, type } = variableItem;

  if (!key) {
    return {
      ...variableItem,
      message: 'Variable is not defined',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  const parsedPath = parseVariablePath(key);

  if (!context) {
    return {
      ...variableItem,
      message: `Variable ${key} cannot be validated, because the workflow schema is invalid`,
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (type === 'foreach') {
    try {
      const itemSchema = getForeachItemSchema(context, key);
      if (itemSchema instanceof z.ZodUnknown) {
        return {
          ...variableItem,
          message: 'Unable to determine foreach item type',
          severity: 'warning',
          owner: 'variable-validation',
          hoverMessage: getVariableHoverMessage(key, itemSchema),
        };
      }
      return {
        ...variableItem,
        message: null,
        severity: null,
        owner: 'variable-validation',
        hoverMessage: getVariableHoverMessage(key, itemSchema),
      };
    } catch (error) {
      if (error instanceof InvalidForeachParameterError) {
        return {
          ...variableItem,
          message: error.message,
          severity: 'warning',
          owner: 'variable-validation',
          hoverMessage: null,
        };
      }
      throw error;
    }
  }

  if (!parsedPath) {
    return {
      ...variableItem,
      message: `Invalid variable path: ${key}`,
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (parsedPath.errors) {
    return {
      ...variableItem,
      message: parsedPath.errors.join(', '),
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (!parsedPath?.propertyPath) {
    return {
      ...variableItem,
      message: 'Failed to parse variable path',
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  const { schema: refSchema } = getSchemaAtPath(context, parsedPath.propertyPath);

  if (!refSchema) {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} is invalid`,
      severity: 'error',
      owner: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (refSchema instanceof z.ZodAny && refSchema.description) {
    return {
      ...variableItem,
      message: refSchema.description,
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: getVariableHoverMessage(parsedPath.propertyPath, refSchema),
    };
  }

  if (refSchema instanceof z.ZodUnknown) {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} cannot be validated, because it's type is unknown`,
      severity: 'warning',
      owner: 'variable-validation',
      hoverMessage: getVariableHoverMessage(parsedPath.propertyPath, refSchema),
    };
  }

  return {
    ...variableItem,
    message: null,
    severity: null,
    owner: 'variable-validation',
    hoverMessage: getVariableHoverMessage(parsedPath.propertyPath, refSchema),
  };
}

// This function will be replaced with a hover provider,
// which will allow to hover over each part of the path and show the type description
function getVariableHoverMessage(propertyPath: string, schema: z.ZodType): string {
  return [
    `<pre>(property) ${propertyPath}:</pre>`,
    '\n',
    '```',
    getDetailedTypeDescription(schema, {
      maxDepth: 2,
    }),
    '```',
  ].join('\n');
}
