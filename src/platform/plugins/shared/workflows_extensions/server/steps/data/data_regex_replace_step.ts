/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataRegexReplaceStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const dataRegexReplaceStepDefinition = createServerStepDefinition({
  ...dataRegexReplaceStepCommonDefinition,
  handler: async (context) => {
    try {
      const source = context.contextManager.renderInputTemplate(context.config.source);
      const detailed = context.config.detailed || false;
      const { pattern, replacement, flags = '' } = context.input;

      if (source == null) {
        context.logger.error('Input source is null or undefined');
        return {
          error: new Error(
            'Source cannot be null or undefined. Please provide a string or array of strings to replace in.'
          ),
        };
      }

      const isArray = Array.isArray(source);
      if (!isArray && typeof source !== 'string') {
        context.logger.error(`Input source has invalid type: ${typeof source}`);
        return {
          error: new Error(
            `Expected source to be a string or array, but received ${typeof source}. Please provide a string or array of strings.`
          ),
        };
      }

      const sourceArray = isArray ? source : [source];
      const shouldReturnString = !isArray;

      if (sourceArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Replacing in ${sourceArray.length} item(s) using pattern: ${pattern} with flags: ${flags}`
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

      const replacedItems: string[] = [];
      let totalMatchCount = 0;

      for (const item of sourceArray) {
        if (typeof item !== 'string') {
          context.logger.warn(`Skipping non-string item in array: ${typeof item}`);
          replacedItems.push(String(item));
        } else {
          const matches = item.match(regex);
          const matchCount = matches ? matches.length : 0;
          totalMatchCount += matchCount;

          const replaced = item.replace(regex, replacement);
          replacedItems.push(replaced);
        }
      }

      context.logger.debug(
        `Replacement complete: ${totalMatchCount} matches replaced in ${sourceArray.length} item(s)`
      );

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
