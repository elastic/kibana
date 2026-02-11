/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyInclude } from './field_include_utils';
import { dataMapStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const dataMapStepDefinition = createServerStepDefinition({
  ...dataMapStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const rawFields = context.rawInput?.fields ?? {};

      if (items == null) {
        context.logger.error('Input items is null or undefined');
        return {
          error: new Error(
            'Items cannot be null or undefined. Please provide an array or object to map.'
          ),
        };
      }

      const isArray = Array.isArray(items);
      if (!isArray && typeof items !== 'object') {
        context.logger.error(`Input items has invalid type: ${typeof items}`);
        return {
          error: new Error(
            `Expected items to be an array or object, but received ${typeof items}. Please provide an array or object to map.`
          ),
        };
      }

      const itemsArray = isArray ? items : [items];
      const shouldReturnObject = !isArray;

      if (itemsArray.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      const fieldKeys = Object.keys(rawFields);
      context.logger.debug(`Mapping ${itemsArray.length} item(s) with ${fieldKeys.length} fields`);

      const mappedItems = itemsArray.map((item, index) => {
        if (fieldKeys.length === 0) return item;
        const rendered = context.contextManager.renderInputTemplate(rawFields, { item, index });
        const mappedItem: Record<string, unknown> = {};
        for (const key of fieldKeys) {
          mappedItem[key] = (rendered as Record<string, unknown>)[key];
        }
        return mappedItem;
      });

      context.logger.debug(`Successfully mapped ${mappedItems.length} item(s)`);

      let output = mappedItems;
      const pick = context.input.transform?.pick;
      if (pick != null) {
        output = mappedItems.map((item) => applyInclude(item, pick)) as typeof mappedItems;
      }

      return { output: shouldReturnObject ? output[0] : output };
    } catch (error) {
      context.logger.error('Failed to map items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to map items'),
      };
    }
  },
});
