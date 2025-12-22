/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataRegexExtractStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

function extractFieldsFromMatch(
  match: RegExpExecArray,
  fields: Record<string, string>
): Record<string, unknown> {
  const extractedFields: Record<string, unknown> = {};

  for (const [fieldName, groupRef] of Object.entries(fields)) {
    if (groupRef.startsWith('$')) {
      const index = parseInt(groupRef.slice(1), 10);
      extractedFields[fieldName] = isNaN(index) ? null : match[index] ?? null;
    } else {
      extractedFields[fieldName] = match.groups?.[groupRef] ?? null;
    }
  }

  return extractedFields;
}

export const dataRegexExtractStepDefinition = createServerStepDefinition({
  ...dataRegexExtractStepCommonDefinition,
  handler: async (context) => {
    try {
      const source = context.contextManager.renderInputTemplate(context.config.source);
      const errorIfNoMatch = context.config.errorIfNoMatch || false;
      const { pattern, fields, flags = '' } = context.input;

      if (source == null) {
        context.logger.error('Input source is null or undefined');
        return {
          error: new Error(
            'Source cannot be null or undefined. Please provide a string or array of strings to extract from.'
          ),
        };
      }

      const isArray = Array.isArray(source);
      if (!isArray && typeof source !== 'string') {
        context.logger.error(`Input source has invalid type: ${typeof source}`);
        return {
          error: new Error(
            `Expected source to be a string or array, but received ${typeof source}. Please provide a string or array of strings to extract from.`
          ),
        };
      }

      const sourceArray = isArray ? source : [source];
      const shouldReturnObject = !isArray;

      if (sourceArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Extracting from ${sourceArray.length} item(s) using pattern: ${pattern} with flags: ${flags}`
      );

      let regex: RegExp;
      try {
        regex = new RegExp(pattern, flags);
      } catch (err) {
        context.logger.error('Invalid regex pattern', err);
        return {
          error: new Error(
            `Invalid regex pattern: ${pattern}. ${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          ),
        };
      }

      const extractedItems: Array<Record<string, unknown> | null> = [];
      let matchCount = 0;

      for (const item of sourceArray) {
        if (typeof item !== 'string') {
          context.logger.warn(`Skipping non-string item in array: ${typeof item}`);
          extractedItems.push(null);
        } else {
          const match = regex.exec(item);

          if (!match) {
            if (errorIfNoMatch) {
              context.logger.error(`No match found for pattern: ${pattern}`);
              return {
                error: new Error(
                  `Pattern "${pattern}" did not match the source text. Set errorIfNoMatch to false to return null instead.`
                ),
              };
            }
            extractedItems.push(null);
          } else {
            matchCount++;
            const extractedFields = extractFieldsFromMatch(match, fields);
            extractedItems.push(extractedFields);
          }
        }
      }

      context.logger.debug(
        `Extraction complete: ${matchCount} matches found out of ${sourceArray.length} item(s)`
      );

      return { output: shouldReturnObject ? extractedItems[0] : extractedItems };
    } catch (error) {
      context.logger.error('Failed to extract data', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to extract data using regex'
        ),
      };
    }
  },
});
