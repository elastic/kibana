/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPropertyItem, CustomPropertyValidationResult } from '../model/types';

export async function validateCustomProperties(
  customPropertyItems: CustomPropertyItem[]
): Promise<CustomPropertyValidationResult[]> {
  const validationResultsPromises: Promise<CustomPropertyValidationResult | null>[] = [];
  for (const customPropertyItem of customPropertyItems) {
    validationResultsPromises.push(
      customPropertyItem
        .validator(customPropertyItem.propertyValue, {
          stepType: customPropertyItem.stepType,
          scope: customPropertyItem.scope,
          propertyKey: customPropertyItem.propertyKey,
        })
        .then((result): CustomPropertyValidationResult | null => {
          if (!result) {
            return null;
          }
          const baseResult = {
            id: customPropertyItem.id,
            afterMessage: result.afterMessage ?? undefined,
            startLineNumber: customPropertyItem.startLineNumber,
            startColumn: customPropertyItem.startColumn,
            endLineNumber: customPropertyItem.endLineNumber,
            endColumn: customPropertyItem.endColumn,
            yamlPath: customPropertyItem.yamlPath,
            key: customPropertyItem.key,
            owner: 'custom-property-validation' as const,
          };
          if (result.severity === null) {
            return {
              ...baseResult,
              severity: null,
              message: null,
              hoverMessage: result.hoverMessage ?? null,
            };
          }
          return {
            ...baseResult,
            severity: result.severity,
            message: result.message ?? '',
            hoverMessage: result.hoverMessage ?? null,
          };
        })
    );
  }
  const validationResults = await Promise.all(validationResultsPromises);
  return validationResults.filter(
    (result): result is CustomPropertyValidationResult => result !== null
  );
}
