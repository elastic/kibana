/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getSchemaAtPath,
  LIQUID_DYNAMIC_KEY_SEGMENT,
  parsePath,
} from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import type { DynamicStepContextSchema } from '@kbn/workflows/spec/schema';
import { z } from '@kbn/zod/v4';
import type { VariableItem, YamlValidationResult } from '../types';
import { getDetailedTypeDescription } from '../../zod/zod_type_description';
import { parseVariablePath } from '../parse_variable_path';
import { InvalidForeachParameterError } from '../context/errors';
import {
  FOREACH_ITEM_SCHEMA_DESC,
  getForeachItemSchema,
} from '../context/get_foreach_state_schema';
import { getPropertyReferenceOptions } from '../context/property_reference_options';

// The deepest schema on the path that resolves, and the property it doesn't have.
const getUnresolvedProperty = (
  context: typeof DynamicStepContextSchema,
  propertyPath: string
): { schema: z.ZodType; property: string } | undefined => {
  const segments = parsePath(propertyPath);
  const { schema, scopedToPath } = getSchemaAtPath(context, propertyPath, { partial: true });
  if (!segments || !schema || scopedToPath === null) {
    return undefined;
  }
  const property = segments.find((_, index) => segments.slice(0, index).join('.') === scopedToPath);
  return property === undefined ? undefined : { schema, property };
};

// Why `propertyPath` doesn't resolve: unknown when it reads a dynamic key the schema allows.
const getUnresolvedReference = (
  context: typeof DynamicStepContextSchema,
  propertyPath: string
): { allowed: true } | { allowed: false; message: string } => {
  const unresolved = getUnresolvedProperty(context, propertyPath);
  const options = unresolved && getPropertyReferenceOptions(unresolved.schema);
  if (unresolved?.property === LIQUID_DYNAMIC_KEY_SEGMENT) {
    return options?.allowDynamicKeys
      ? { allowed: true }
      : { allowed: false, message: `Variable ${propertyPath} is invalid` };
  }
  const message = unresolved && options?.unknownPropertyMessage?.(unresolved.property);
  return { allowed: false, message: message ?? `Variable ${propertyPath} is invalid` };
};

export interface VariableValidationOptions {
  /**
   * Editor presentation. When false no hover text is built, and a variable that
   * resolves cleanly produces no result at all: the server reports diagnostics
   * only, and building hover text for every valid variable is the bulk of the
   * work on a large workflow.
   *
   * @default true
   */
  includeEditorDecorations?: boolean;
}

export function validateVariable(
  variableItem: VariableItem,
  context: typeof DynamicStepContextSchema,
  options?: VariableValidationOptions
): YamlValidationResult | null {
  const { key, type } = variableItem;
  const withDecorations = options?.includeEditorDecorations !== false;
  const hoverMessageFor = (propertyPath: string, schema: z.ZodType) =>
    withDecorations ? getVariableHoverMessage(propertyPath, schema) : null;

  const parsedPath = parseVariablePath(key);

  if (type === 'foreach') {
    try {
      const itemSchema = getForeachItemSchema(context, key);
      if (itemSchema instanceof z.ZodUnknown) {
        return {
          ...variableItem,
          message: itemSchema.description ?? FOREACH_ITEM_SCHEMA_DESC.RUNTIME_JSON,
          severity: 'warning',
          owner: 'variable-validation',
          ruleId: 'foreachItemRuntimeType',
          hoverMessage: hoverMessageFor(key, itemSchema),
        };
      }
      if (!withDecorations) {
        return null;
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
          ruleId: 'invalidForeachParameter',
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
      ruleId: 'invalidVariablePath',
      hoverMessage: null,
    };
  }

  if (parsedPath.errors) {
    return {
      ...variableItem,
      message: parsedPath.errors.join(', '),
      severity: 'error',
      owner: 'variable-validation',
      ruleId: 'variablePathParseError',
      hoverMessage: null,
    };
  }

  if (!parsedPath?.propertyPath) {
    return {
      ...variableItem,
      message: 'Failed to parse variable path',
      severity: 'error',
      owner: 'variable-validation',
      ruleId: 'variablePathParseError',
      hoverMessage: null,
    };
  }

  const { schema: resolvedSchema } = getSchemaAtPath(context, parsedPath.propertyPath);
  const unresolvedReference = resolvedSchema
    ? undefined
    : getUnresolvedReference(context, parsedPath.propertyPath);

  if (unresolvedReference && !unresolvedReference.allowed) {
    return {
      ...variableItem,
      message: unresolvedReference.message,
      severity: 'error',
      owner: 'variable-validation',
      ruleId: 'invalidVariableReference',
      hoverMessage: null,
    };
  }
  const refSchema = resolvedSchema ?? z.unknown();

  if (refSchema instanceof z.ZodAny && refSchema.description) {
    return {
      ...variableItem,
      message: refSchema.description,
      severity: 'warning',
      owner: 'variable-validation',
      ruleId: 'unknownVariableType',
      hoverMessage: hoverMessageFor(parsedPath.propertyPath, refSchema),
    };
  }

  if (refSchema instanceof z.ZodUnknown) {
    return {
      ...variableItem,
      message: `Variable ${parsedPath.propertyPath} cannot be validated, because it's type is unknown`,
      severity: 'warning',
      owner: 'variable-validation',
      ruleId: 'unknownVariableType',
      hoverMessage: hoverMessageFor(parsedPath.propertyPath, refSchema),
    };
  }

  if (!withDecorations) {
    return null;
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
