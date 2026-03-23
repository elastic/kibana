/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegex, validateInputLength, validateSourceInput } from './regex_utils';
import { dataRegexReplaceStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const dataRegexReplaceStepDefinition = createServerStepDefinition({
  ...dataRegexReplaceStepCommonDefinition,
  handler: async (context) => {
    try {
      const source = context.contextManager.renderInputTemplate(context.config.source);
      const detailed = context.config.detailed || false;
      const { pattern, replacement, flags = '' } = context.input;

      const sourceValidation = validateSourceInput(source, context.logger);
      if (!sourceValidation.valid) {
        return { error: sourceValidation.error };
      }
      const { isArray } = sourceValidation;

      const sourceArray = isArray
        ? (source as unknown[])
        : [source as string | Record<string, unknown>];
      const shouldReturnString = !isArray;

      if (sourceArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Replacing in ${sourceArray.length} item(s) using pattern: ${pattern} with flags: ${flags}`
      );

      const regexResult = createRegex(pattern, flags, {
        error: (message: string, error?: unknown) =>
          context.logger.error(message, error as Error | undefined),
        warn: (message: string) => context.logger.warn(message),
      });
      if ('error' in regexResult) {
        return { error: regexResult.error };
      }
      const { regex } = regexResult;

      const replacedItems: string[] = [];
      let totalMatchCount = 0;

      for (const item of sourceArray) {
        // Check for cancellation to allow prompt workflow termination
        if (context.abortSignal.aborted) {
          context.logger.debug('Regex replacement cancelled via abort signal');
          return {
            error: new Error('Operation cancelled'),
          };
        }

        if (typeof item !== 'string') {
          context.logger.warn(`Skipping non-string item in array: ${typeof item}`);
          replacedItems.push(String(item));
        } else {
          const lengthValidation = validateInputLength(item, context.logger);
          if (!lengthValidation.valid) {
            return { error: lengthValidation.error };
          }

          if (detailed) {
            // Note: matchCount is only accurate when the global flag is set.
            // Without the global flag, match() returns only the first match.
            const matches = item.match(regex);
            const matchCount = matches ? matches.length : 0;
            totalMatchCount += matchCount;
          }

          const replaced = item.replace(regex, replacement);
          replacedItems.push(replaced);
        }
      }

      if (detailed) {
        context.logger.debug(
          `Replacement complete: ${totalMatchCount} matches replaced in ${sourceArray.length} item(s)`
        );
      } else {
        context.logger.debug(`Replacement complete for ${sourceArray.length} item(s)`);
      }

      if (detailed) {
        return {
          output: {
            original: shouldReturnString ? sourceArray[0] : sourceArray,
            replaced: shouldReturnString ? replacedItems[0] : replacedItems,
            matchCount: totalMatchCount,
          },
        };
      }

      return { output: shouldReturnString ? replacedItems[0] : replacedItems };
    } catch (error) {
      context.logger.error('Failed to replace text', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to replace text using regex'
        ),
      };
    }
  },
});
