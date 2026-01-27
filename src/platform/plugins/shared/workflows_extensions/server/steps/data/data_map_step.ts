/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataMapStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const dataMapStepDefinition = createServerStepDefinition({
  ...dataMapStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const rawFields = context.rawInput.fields;

      if (items == null) {
        context.logger.error('Input items is null or undefined');
        return {
          error: new Error(
            'Items cannot be null or undefined. Please provide an array or object to map.'
          ),
        };
      }

      // Only accept arrays or objects, reject primitives (strings, numbers, booleans)
      const isArray = Array.isArray(items);
      if (!isArray && typeof items !== 'object') {
        context.logger.error(`Input items has invalid type: ${typeof items}`);
        return {
          error: new Error(
            `Expected items to be an array or object, but received ${typeof items}. Please provide an array or object to map.`
          ),
        };
      }

      // Normalize: wrap single object in array, then unwrap result if needed
      const itemsArray = isArray ? items : [items];
      const shouldReturnObject = !isArray;

      if (itemsArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Mapping ${itemsArray.length} item(s) with ${Object.keys(rawFields).length} fields`
      );

      const mappedItems = itemsArray.map((item, index) => {
        const rendered = context.contextManager.renderInputTemplate(rawFields, { item, index });
        const mappedItem: Record<string, unknown> = {};
        for (const key of Object.keys(rawFields)) {
          mappedItem[key] = (rendered as Record<string, unknown>)[key];
        }
        return mappedItem;
      });

      context.logger.debug(`Successfully mapped ${mappedItems.length} item(s)`);

      // Return object if input was object, otherwise return array
      return { output: shouldReturnObject ? mappedItems[0] : mappedItems };
    } catch (error) {
      context.logger.error('Failed to map items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to map items'),
      };
    }
  },
});
