/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateKql } from '@kbn/eval-kql';
import { dataFilterStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

function isKqlSyntaxError(error: unknown): boolean {
  return error instanceof Error && error.name === 'KQLSyntaxError';
}

export const dataFilterStepDefinition = createServerStepDefinition({
  ...dataFilterStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const { condition, limit } = context.input;
      const detailed = context.config.detailed ?? false;

      if (!Array.isArray(items)) {
        context.logger.error(`Input items has invalid type: ${typeof items}`);
        return {
          error: new Error(
            `Expected items to be an array, but received ${typeof items}. Please provide an array to filter.`
          ),
        };
      }

      const inputCount = items.length;

      if (!condition || condition.trim() === '') {
        context.logger.debug('No condition provided, returning all items');
        if (detailed) {
          return {
            output: {
              items,
              metadata: { inputCount, matchedCount: inputCount },
            },
          };
        }
        return { output: items };
      }

      context.logger.debug(
        `Filtering ${inputCount} item(s) with condition: ${condition}${
          limit ? ` (limit: ${limit})` : ''
        }`
      );

      const filteredItems: unknown[] = [];
      let matchedCount = 0;

      for (let index = 0; index < items.length; index++) {
        const item = items[index];

        if (context.abortSignal?.aborted) {
          context.logger.warn('Filter operation aborted by signal');
          return { error: new Error('Operation was aborted') };
        }

        try {
          const matches = evaluateKql(condition, { item, index });

          if (matches) {
            filteredItems.push(item);
            matchedCount++;

            if (limit && matchedCount >= limit) {
              context.logger.debug(`Reached limit of ${limit} matches, stopping filter`);
              break;
            }
          }
        } catch (error) {
          // KQL syntax errors are fatal - invalid condition provided by the user
          if (isKqlSyntaxError(error)) {
            context.logger.error('Invalid KQL condition', error);
            return {
              error: new Error(`Invalid KQL condition: ${(error as Error).message}`),
            };
          }
          // Runtime evaluation errors (e.g. null item) - skip and continue
          context.logger.warn(`Failed to evaluate condition for item at index ${index}`, error);
        }
      }

      context.logger.debug(`Filtered ${matchedCount} item(s) from ${inputCount} total`);

      if (detailed) {
        return {
          output: {
            items: filteredItems,
            metadata: { inputCount, matchedCount },
          },
        };
      }

      return { output: filteredItems };
    } catch (error) {
      context.logger.error('Failed to filter items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to filter items'),
      };
    }
  },
});
