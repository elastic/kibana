/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataMapStepCommonDefinition } from '../../common/step_types';
import { createServerStepDefinition } from '../step_registry/types';

export const dataMapStepDefinition = createServerStepDefinition({
  ...dataMapStepCommonDefinition,
  handler: async (context) => {
    try {
      const rawInput = context.rawInput as { items: unknown; fields: Record<string, unknown> };
      const items = context.contextManager.renderInputTemplate(rawInput.items);
      const rawFields = rawInput.fields;

      if (!Array.isArray(items)) {
        context.logger.error('Input items is not an array');
        return {
          error: new Error(
            `Expected items to be an array, but received ${typeof items}. Please provide an array of items to map.`
          ),
        };
      }

      if (items.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      context.logger.debug(
        `Mapping ${items.length} items with ${Object.keys(rawFields).length} fields`
      );

      const mappedItems = items.map((item, index) => {
        const rendered = context.contextManager.renderInputTemplate(rawFields, { item, index });

        const mappedItem: Record<string, unknown> = {};
        for (const key of Object.keys(rawFields)) {
          mappedItem[key] = (rendered as Record<string, unknown>)[key];
        }

        return mappedItem;
      });

      context.logger.debug(`Successfully mapped ${mappedItems.length} items`);

      return { output: mappedItems };
    } catch (error) {
      context.logger.error('Failed to map items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to map items'),
      };
    }
  },
});
