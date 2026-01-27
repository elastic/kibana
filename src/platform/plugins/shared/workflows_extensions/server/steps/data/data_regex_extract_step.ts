/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegex, validateInputLength, validateSourceInput } from './regex_utils';
import { dataRegexExtractStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

function extractFieldsFromMatch(
  match: RegExpMatchArray,
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

      const sourceValidation = validateSourceInput(source, context.logger);
      if (!sourceValidation.valid) {
        return { error: sourceValidation.error };
      }
      const { isArray } = sourceValidation;

      const sourceArray = isArray
        ? (source as unknown[])
        : [source as string | Record<string, unknown>];
      const shouldReturnObject = !isArray;

      if (sourceArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Extracting from ${sourceArray.length} item(s) using pattern: ${pattern} with flags: ${flags}`
      );

      // Validate the regex pattern with the user-provided flags
      const regexResult = createRegex(pattern, flags, {
        error: (message: string, error?: unknown) =>
          context.logger.error(message, error as Error | undefined),
        warn: (message: string) => context.logger.warn(message),
      });
      if ('error' in regexResult) {
        return { error: regexResult.error };
      }

      // Remove global flag for matching to ensure match() returns capture groups instead of all matches
      // When 'g' flag is present, match() returns array of all matches without groups
      const normalizedFlags = flags?.replace(/g/g, '');
      const matchRegex = new RegExp(pattern, normalizedFlags);

      const extractedItems: Array<Record<string, unknown> | null> = [];
      let matchCount = 0;

      for (const item of sourceArray) {
        // Check for cancellation to allow prompt workflow termination
        if (context.abortSignal.aborted) {
          context.logger.debug('Regex extraction cancelled via abort signal');
          return {
            error: new Error('Operation cancelled'),
          };
        }

        if (typeof item !== 'string') {
          context.logger.warn(`Skipping non-string item in array: ${typeof item}`);
          extractedItems.push(null);
        } else {
          const lengthValidation = validateInputLength(item, context.logger);
          if (!lengthValidation.valid) {
            return { error: lengthValidation.error };
          }
          const match = item.match(matchRegex);

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
