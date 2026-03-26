/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataDedupeStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

/**
 * Builds a unique string key from an item based on the specified field names.
 *
 * This function creates a composite key by extracting values from the specified fields
 * and joining them together. JSON.stringify is used to handle complex values (objects,
 * arrays, null, undefined) consistently.
 *
 * @example Single key
 * const item = { id: 1, email: 'alice@example.com' };
 * buildKeyFromItem(item, ['email']);
 * // Returns: '"alice@example.com"'
 *
 * @example Multiple keys
 * const item = { user_id: 1, event_type: 'login' };
 * buildKeyFromItem(item, ['user_id', 'event_type']);
 * // Returns: '1::"login"'
 *
 * @example Complex values (objects, null)
 * const item1 = { id: 1, metadata: { role: 'admin' } };
 * buildKeyFromItem(item1, ['metadata']);
 * // Returns: '{"role":"admin"}'
 *
 * const item2 = { id: 2, status: null };
 * buildKeyFromItem(item2, ['status']);
 * // Returns: 'null'
 */
function buildKeyFromItem(item: unknown, keys: string[]): string {
  if (typeof item !== 'object' || item === null) {
    return JSON.stringify(item);
  }

  const keyParts = keys.map((key) => {
    const value = (item as Record<string, unknown>)[key];
    return JSON.stringify(value);
  });

  return keyParts.join('::');
}

export const dataDedupeStepDefinition = createServerStepDefinition({
  ...dataDedupeStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const strategy = context.config.strategy || 'keep_first';
      const { keys } = context.input;

      if (!Array.isArray(items)) {
        context.logger.error('Input items is not an array');
        return {
          error: new Error(
            `Expected items to be an array, but received ${typeof items}. Please provide an array of items to deduplicate.`
          ),
        };
      }

      if (items.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      if (!Array.isArray(keys) || keys.length === 0) {
        context.logger.error('Keys must be a non-empty array');
        return {
          error: new Error('Keys must be a non-empty array of field names'),
        };
      }

      context.logger.debug(
        `Deduplicating ${items.length} items using keys: ${keys.join(
          ', '
        )} with strategy: ${strategy}`
      );

      const seenKeys = new Map<string, unknown>();

      if (strategy === 'keep_first') {
        for (const item of items) {
          const keyValue = buildKeyFromItem(item, keys);
          if (!seenKeys.has(keyValue)) {
            seenKeys.set(keyValue, item);
          }
        }
      } else {
        for (const item of items) {
          const keyValue = buildKeyFromItem(item, keys);
          seenKeys.set(keyValue, item);
        }
      }

      const dedupedItems = Array.from(seenKeys.values());
      const duplicatesRemoved = items.length - dedupedItems.length;

      context.logger.debug(
        `Deduplication complete: ${dedupedItems.length} unique items, ${duplicatesRemoved} duplicates removed`
      );

      return { output: dedupedItems };
    } catch (error) {
      context.logger.error('Failed to deduplicate items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to deduplicate items'),
      };
    }
  },
});
