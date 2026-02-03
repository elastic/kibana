/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import type { z } from '@kbn/zod/v4';
import { stepSchemas } from '../../../../common/step_schemas';
import {
  getCachedOption,
  getCachedSearchOption,
  getCacheKeyForValue,
  setCachedOption,
} from '../../../shared/lib/custom_property_selection_cache';
import type { CustomPropertyItem, CustomPropertyValidationResult } from '../model/types';

function getPropertySchema(
  stepType: string,
  scope: 'config' | 'input',
  propertyKey: string
): z.ZodType | null {
  const connector = stepSchemas.getAllConnectorsMapCache()?.get(stepType);
  if (!connector) {
    return null;
  }

  const baseSchema = scope === 'config' ? connector.configSchema : connector.paramsSchema;
  if (!baseSchema) {
    return null;
  }

  const result = getSchemaAtPath(baseSchema, propertyKey);
  return result.schema;
}

export async function validateCustomProperties(
  customPropertyItems: CustomPropertyItem[]
): Promise<CustomPropertyValidationResult[]> {
  const validationResultsPromises: Promise<CustomPropertyValidationResult>[] = [];
  for (const customPropertyItem of customPropertyItems) {
    const { selectionHandler, propertyValue, context } = customPropertyItem;
    const { stepType, scope, propertyKey } = context;

    const propertySchema = getPropertySchema(stepType, scope, propertyKey);
    if (propertySchema && propertyValue !== null && propertyValue !== undefined) {
      const validationResult = propertySchema.safeParse(propertyValue);
      if (validationResult.success) {
        // Only run custom validation if the value is valid according to the schema
        validationResultsPromises.push(
          (async (): Promise<CustomPropertyValidationResult> => {
            const cacheKey = getCacheKeyForValue(stepType, scope, propertyKey, propertyValue);

            let resolvedOption = getCachedOption(cacheKey);
            if (!resolvedOption) {
              resolvedOption = getCachedSearchOption(stepType, scope, propertyKey, propertyValue);
            }
            if (!resolvedOption && propertyValue !== null && propertyValue !== undefined) {
              resolvedOption = await selectionHandler.resolve(propertyValue, context);
              if (resolvedOption) {
                setCachedOption(cacheKey, resolvedOption);
              }
            }

            const input = String(propertyValue);
            const details = await selectionHandler.getDetails(input, context, resolvedOption);

            const hasError =
              !resolvedOption && propertyValue !== null && propertyValue !== undefined;

            const hoverParts: string[] = [];
            if (details.message) {
              hoverParts.push(details.message);
            }
            if (details.links && details.links.length > 0) {
              hoverParts.push(
                details.links.map((link) => `[${link.text}](${link.path})`).join(' | ')
              );
            }
            const hoverMessage = hoverParts.length > 0 ? hoverParts.join('\n\n') : null;

            const beforeMessage = resolvedOption ? `✓ ${resolvedOption.label}` : undefined;

            if (hasError) {
              return {
                id: customPropertyItem.id,
                severity: 'error' as const,
                message: details.message,
                beforeMessage,
                afterMessage: null,
                hoverMessage,
                startLineNumber: customPropertyItem.startLineNumber,
                startColumn: customPropertyItem.startColumn,
                endLineNumber: customPropertyItem.endLineNumber,
                endColumn: customPropertyItem.endColumn,
                owner: 'custom-property-validation' as const,
              };
            }

            return {
              id: customPropertyItem.id,
              severity: null,
              message: null,
              beforeMessage,
              afterMessage: null,
              hoverMessage,
              startLineNumber: customPropertyItem.startLineNumber,
              startColumn: customPropertyItem.startColumn,
              endLineNumber: customPropertyItem.endLineNumber,
              endColumn: customPropertyItem.endColumn,
              owner: 'custom-property-validation' as const,
            };
          })()
        );
      }
    }
  }
  return Promise.all(validationResultsPromises);
}
