/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows/spec/schema';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import { getDetailedTypeDescription } from '../../../../common/lib/zod/zod_type_description';
import { getZodTypeName, getSchemaAtPath } from '../../../../common/lib/zod';
import type { VariableItem, YamlValidationResult } from '../model/types';
import { getForeachItemSchema } from '../../workflow_context/lib/get_foreach_state_schema';

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
      source: 'variable-validation',
      hoverMessage: null,
    };
  }

  const parsedPath = parseVariablePath(key);

  if (!parsedPath) {
    return {
      ...variableItem,
      message: `Invalid variable path: ${key}`,
      severity: 'error',
      source: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (parsedPath.errors) {
    if (type === 'foreach' && context) {
      try {
        const itemSchema = getForeachItemSchema(context, key);
        return {
          ...variableItem,
          message: null,
          severity: null,
          source: 'variable-validation',
          hoverMessage: `<pre>(property) ${key}: ${getDetailedTypeDescription(itemSchema)}</pre>`,
        };
      } catch (e) {
        return {
          ...variableItem,
          message: `Foreach parameter can be an array or a JSON string. ${key} is not valid JSON`,
          severity: 'error',
          source: 'variable-validation',
          hoverMessage: null,
        };
      }
    } else {
      return {
        ...variableItem,
        message: parsedPath.errors.join(', '),
        severity: 'error',
        source: 'variable-validation',
        hoverMessage: null,
      };
    }
  }

  if (!parsedPath?.propertyPath) {
    return {
      ...variableItem,
      message: 'Failed to parse variable path',
      severity: 'error',
      source: 'variable-validation',
      hoverMessage: null,
    };
  }

  if (!context) {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} cannot be validated, because the workflow schema is invalid`,
      severity: 'warning',
      source: 'variable-validation',
      hoverMessage: null,
    };
  }

  const refSchema = getSchemaAtPath(context, parsedPath.propertyPath);

  if (!refSchema) {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} is invalid`,
      severity: 'error',
      source: 'variable-validation',
      hoverMessage: null,
    };
  }

  const zodTypeName = getZodTypeName(refSchema);

  if (zodTypeName === 'string' && type === 'foreach') {
    return {
      ...variableItem,
      message: `Foreach parameter should be an array or a JSON string. ${parsedPath.propertyPath} is unknown string, engine will try to parse it as JSON in runtime, but it might fail`,
      severity: 'warning',
      source: 'variable-validation',
      hoverMessage: `<pre>(property) ${parsedPath.propertyPath}: ${getDetailedTypeDescription(
        refSchema
      )}</pre>`,
    };
  }

  if (zodTypeName !== 'array' && type === 'foreach') {
    return {
      ...variableItem,
      message: `Foreach parameter should be an array or a JSON string. ${parsedPath.propertyPath} is ${zodTypeName}`,
      severity: 'error',
      source: 'variable-validation',
      hoverMessage: `<pre>(property) ${parsedPath.propertyPath}: ${getDetailedTypeDescription(
        refSchema
      )}</pre>`,
    };
  }

  if (zodTypeName === 'any' && refSchema.description) {
    return {
      ...variableItem,
      message: refSchema.description,
      severity: 'warning',
      source: 'variable-validation',
      hoverMessage: `<pre>(property) ${parsedPath.propertyPath}: ${getDetailedTypeDescription(
        refSchema
      )}</pre>`,
    };
  }

  if (zodTypeName === 'unknown') {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} cannot be validated, because it's type is unknown`,
      severity: 'warning',
      source: 'variable-validation',
      hoverMessage: `<pre>(property) ${parsedPath.propertyPath}: ${getDetailedTypeDescription(
        refSchema
      )}</pre>`,
    };
  }

  return {
    ...variableItem,
    message: null,
    severity: null,
    source: 'variable-validation',
    hoverMessage: `<pre>(property) ${parsedPath.propertyPath}: ${getDetailedTypeDescription(
      refSchema
    )}</pre>`,
  };
}
