/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SelectionDetails, SelectionOption } from '@kbn/workflows';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import type { z } from '@kbn/zod/v4';
import { isTemplateReference } from './is_template_reference';
import { stepSchemas } from '../../../../common/step_schemas';
import {
  getCachedCustomPropertyValidationOutcome,
  getCachedSearchOption,
  getCustomPropertyValidationOutcomeCacheKey,
  setCachedCustomPropertyValidationOutcome,
} from '../../../shared/lib/custom_property_selection_cache';
import type { CustomPropertyItem, CustomPropertyValidationResult } from '../model/types';

export { clearCustomPropertyValidationOutcomeCache } from '../../../shared/lib/custom_property_selection_cache';

function buildValidationResult(
  customPropertyItem: CustomPropertyItem,
  resolvedOption: SelectionOption | null,
  details: SelectionDetails
): CustomPropertyValidationResult {
  const hasError =
    !resolvedOption &&
    customPropertyItem.propertyValue !== null &&
    customPropertyItem.propertyValue !== undefined;

  const hoverParts: string[] = [];
  if (details.message) {
    hoverParts.push(details.message);
  }
  if (details.links && details.links.length > 0) {
    hoverParts.push(details.links.map((link) => `[${link.text}](${link.path})`).join(' | '));
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
}

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

function shouldValidateProperty(item: CustomPropertyItem): boolean {
  const { propertyValue, context } = item;
  const { stepType, scope, propertyKey } = context;

  if (typeof propertyValue === 'string' && isTemplateReference(propertyValue)) {
    return false;
  }
  if (propertyValue === null || propertyValue === undefined) {
    return false;
  }
  const propertySchema = getPropertySchema(stepType, scope, propertyKey);
  if (!propertySchema) {
    return false;
  }
  const validationResult = propertySchema.safeParse(propertyValue);
  return validationResult.success;
}

export async function validateCustomProperties(
  customPropertyItems: CustomPropertyItem[]
): Promise<CustomPropertyValidationResult[]> {
  const validationResultsPromises: Promise<CustomPropertyValidationResult>[] = [];
  for (const customPropertyItem of customPropertyItems) {
    if (shouldValidateProperty(customPropertyItem)) {
      const { selectionHandler, propertyValue, context } = customPropertyItem;
      const { stepType, scope, propertyKey } = context;

      validationResultsPromises.push(
        (async (): Promise<CustomPropertyValidationResult> => {
          const outcomeKey = getCustomPropertyValidationOutcomeCacheKey(customPropertyItem);
          const cachedOutcome = getCachedCustomPropertyValidationOutcome(outcomeKey);
          if (cachedOutcome) {
            return buildValidationResult(
              customPropertyItem,
              cachedOutcome.resolvedOption,
              cachedOutcome.details
            );
          }

          let resolvedOption = getCachedSearchOption(
            stepType,
            scope,
            propertyKey,
            propertyValue,
            context.values
          );
          if (!resolvedOption && propertyValue !== null && propertyValue !== undefined) {
            resolvedOption = await selectionHandler.resolve(propertyValue, context);
          }

          const input = String(propertyValue);
          const details = await selectionHandler.getDetails(input, context, resolvedOption);

          setCachedCustomPropertyValidationOutcome(outcomeKey, resolvedOption, details);

          return buildValidationResult(customPropertyItem, resolvedOption, details);
        })()
      );
    }
  }
  return Promise.all(validationResultsPromises);
}
