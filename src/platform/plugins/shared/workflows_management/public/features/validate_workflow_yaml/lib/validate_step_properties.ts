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
  getCachedSearchOption,
  getCachedStepPropertyValidationOutcome,
  getStepPropertyValidationOutcomeCacheKey,
  setCachedStepPropertyValidationOutcome,
} from '../../../shared/lib/step_property_selection_cache';
import type { StepPropertyItem, StepPropertyValidationResult } from '../model/types';

export { clearStepPropertyValidationOutcomeCache } from '../../../shared/lib/step_property_selection_cache';

function buildValidationResult(
  stepPropertyItem: StepPropertyItem,
  resolvedOption: SelectionOption | null,
  details: SelectionDetails
): StepPropertyValidationResult {
  const hasError =
    !resolvedOption &&
    stepPropertyItem.propertyValue !== null &&
    stepPropertyItem.propertyValue !== undefined;

  const hoverParts: string[] = [];
  if (details.message) {
    hoverParts.push(details.message);
  }
  if (details.links && details.links.length > 0) {
    hoverParts.push(details.links.map((link) => `[${link.text}](${link.path})`).join(' | '));
  }
  const hoverMessage = hoverParts.length > 0 ? hoverParts.join('\n\n') : null;

  const beforeMessage = resolvedOption?.label ? `✓ ${resolvedOption.label}` : undefined;

  if (hasError) {
    return {
      id: stepPropertyItem.id,
      severity: 'error' as const,
      message: details.message,
      beforeMessage,
      afterMessage: null,
      hoverMessage,
      startLineNumber: stepPropertyItem.startLineNumber,
      startColumn: stepPropertyItem.startColumn,
      endLineNumber: stepPropertyItem.endLineNumber,
      endColumn: stepPropertyItem.endColumn,
      owner: 'step-property-validation' as const,
    };
  }

  return {
    id: stepPropertyItem.id,
    severity: null,
    message: null,
    beforeMessage,
    afterMessage: null,
    hoverMessage,
    startLineNumber: stepPropertyItem.startLineNumber,
    startColumn: stepPropertyItem.startColumn,
    endLineNumber: stepPropertyItem.endLineNumber,
    endColumn: stepPropertyItem.endColumn,
    owner: 'step-property-validation' as const,
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

function shouldValidateProperty(item: StepPropertyItem): boolean {
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

export async function validateStepProperties(
  stepPropertyItems: StepPropertyItem[]
): Promise<StepPropertyValidationResult[]> {
  const validationResultsPromises: Promise<StepPropertyValidationResult>[] = [];
  for (const stepPropertyItem of stepPropertyItems) {
    if (shouldValidateProperty(stepPropertyItem)) {
      const { selectionHandler, propertyValue, context } = stepPropertyItem;
      const { stepType, scope, propertyKey } = context;

      validationResultsPromises.push(
        (async (): Promise<StepPropertyValidationResult> => {
          const outcomeKey = getStepPropertyValidationOutcomeCacheKey(stepPropertyItem);
          const cachedOutcome = getCachedStepPropertyValidationOutcome(outcomeKey);
          if (cachedOutcome) {
            return buildValidationResult(
              stepPropertyItem,
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

          setCachedStepPropertyValidationOutcome(outcomeKey, resolvedOption, details);

          return buildValidationResult(stepPropertyItem, resolvedOption, details);
        })()
      );
    }
  }
  return Promise.all(validationResultsPromises);
}
