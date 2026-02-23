/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateKql } from '@kbn/eval-kql';
import { dataFindStepCommonDefinition } from '../../../common/steps/data';
import type { StepHandlerContext } from '../../step_registry/types';
import { createServerStepDefinition } from '../../step_registry/types';

type FindStepContext = StepHandlerContext<
  typeof dataFindStepCommonDefinition.inputSchema,
  typeof dataFindStepCommonDefinition.configSchema
>;

function isKqlSyntaxError(error: unknown): boolean {
  return error instanceof Error && error.name === 'KQLSyntaxError';
}

function handleEmptyCondition(
  items: unknown[],
  errorIfEmpty: boolean | undefined,
  detailed: boolean,
  logger: FindStepContext['logger']
) {
  logger.debug('No condition provided, returning first item');
  const firstItem = items.length > 0 ? items[0] : null;

  if (errorIfEmpty && firstItem === null) {
    logger.error('No items found and errorIfEmpty is true');
    return { error: new Error('No items found in the collection') };
  }

  if (detailed) {
    return {
      output: {
        item: firstItem,
        metadata: { matchIndex: firstItem !== null ? 0 : null },
      },
    };
  }
  return { output: firstItem };
}

function searchForMatch(
  items: unknown[],
  condition: string,
  context: FindStepContext
): { foundItem: unknown; matchIndex: number | null } {
  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    if (context.abortSignal?.aborted) {
      context.logger.warn('Find operation aborted by signal');
      throw new Error('Operation was aborted');
    }

    try {
      const matches = evaluateKql(condition, { item, index });

      if (matches) {
        context.logger.debug(`Found match at index ${index}`);
        return { foundItem: item, matchIndex: index };
      }
    } catch (error) {
      // KQL syntax errors are fatal - invalid condition provided by the user
      if (isKqlSyntaxError(error)) {
        throw new Error(`Invalid KQL condition: ${(error as Error).message}`);
      }
      // Runtime evaluation errors (e.g. null item) - skip and continue
      context.logger.warn(`Failed to evaluate condition for item at index ${index}`, error);
    }
  }

  return { foundItem: null, matchIndex: null };
}

function formatOutput(
  foundItem: unknown,
  matchIndex: number | null,
  errorIfEmpty: boolean | undefined,
  detailed: boolean,
  logger: FindStepContext['logger']
) {
  if (foundItem === null) {
    logger.debug('No matching item found');

    if (errorIfEmpty) {
      logger.error('No match found and errorIfEmpty is true');
      return { error: new Error('No item matching the condition was found') };
    }
  }

  if (detailed) {
    return {
      output: {
        item: foundItem,
        metadata: { matchIndex },
      },
    };
  }

  return { output: foundItem };
}

export const dataFindStepDefinition = createServerStepDefinition({
  ...dataFindStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const { condition, errorIfEmpty } = context.input;
      const detailed = context.config.detailed ?? false;

      if (!Array.isArray(items)) {
        context.logger.error(`Input items has invalid type: ${typeof items}`);
        return {
          error: new Error(
            `Expected items to be an array, but received ${typeof items}. Please provide an array to search.`
          ),
        };
      }

      if (!condition || condition.trim() === '') {
        return handleEmptyCondition(items, errorIfEmpty, detailed, context.logger);
      }

      context.logger.debug(
        `Finding first match in ${items.length} item(s) with condition: ${condition}`
      );

      const { foundItem, matchIndex } = searchForMatch(items, condition, context);

      return formatOutput(foundItem, matchIndex, errorIfEmpty, detailed, context.logger);
    } catch (error) {
      context.logger.error('Failed to find item', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to find item'),
      };
    }
  },
});
