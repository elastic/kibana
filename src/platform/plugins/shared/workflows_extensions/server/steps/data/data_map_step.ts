/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dataMapStepCommonDefinition,
  type FieldsNode,
  MAP_DIRECTIVE,
  type MapDirectiveValue,
} from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

const MAX_RECURSION_DEPTH = 10;

interface ProcessFieldsOptions {
  renderTemplate: <T>(value: T, additionalContext?: Record<string, unknown>) => T;
  bindings: Record<string, unknown>;
  depth?: number;
}

/**
 * Checks if a nested field spec has a `$map` directive.
 */
function hasMapDirective(spec: FieldsNode): boolean {
  return typeof spec === 'object' && spec !== null && MAP_DIRECTIVE in spec;
}

/**
 * Extracts the `$map` directive from a nested field spec, if present.
 * Returns `null` when the spec has no `$map` key or the value is malformed
 * (treated as literal nesting).
 */
function findMapDirective(spec: Record<string, FieldsNode>): NonNullable<MapDirectiveValue> | null {
  if (!hasMapDirective(spec)) return null;
  const obj = spec[MAP_DIRECTIVE];
  if (!obj || typeof obj !== 'object' || !('items' in obj) || typeof obj.items !== 'string') {
    return null;
  }
  const mapDirective: MapDirectiveValue = { items: obj.items };
  if (typeof obj.item === 'string') {
    mapDirective.item = obj.item;
  }
  if (typeof obj.index === 'string') {
    mapDirective.index = obj.index;
  }
  return mapDirective;
}

function processFields(
  fields: Record<string, FieldsNode>,
  options: ProcessFieldsOptions
): Record<string, unknown> {
  const { renderTemplate, bindings, depth = 0 } = options;
  const result: Record<string, unknown> = {};
  if (depth >= MAX_RECURSION_DEPTH) {
    return result;
  }

  for (const key of Object.keys(fields)) {
    if (key === MAP_DIRECTIVE) {
      // Skip the directive key itself; it is not an output field
    } else {
      const value = fields[key];
      if (
        typeof value === 'string' ||
        // only strings or objects should be possible here, but adding other types just in case to be safe
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        Array.isArray(value)
      ) {
        result[key] = renderTemplate(value, bindings);
      } else {
        // Nested definition
        const spec = value as Record<string, FieldsNode>;
        if (!hasMapDirective(spec)) {
          // Object nesting
          result[key] = processFields(spec, { ...options, depth: depth + 1 });
        } else {
          // Array nesting
          const mapDir = findMapDirective(spec);
          if (!mapDir) {
            result[key] = []; // nested object with invalid $map is defaulted to empty array
          } else {
            // use the $map to render the nested array
            const nestedItems: unknown = renderTemplate(mapDir.items, bindings);

            if (!Array.isArray(nestedItems)) {
              result[key] = [];
            } else {
              // Build the nested fields spec without the $map directive
              const nestedFields: Record<string, unknown> = {};
              for (const k of Object.keys(spec)) {
                if (k !== MAP_DIRECTIVE) {
                  nestedFields[k] = spec[k];
                }
              }

              result[key] = nestedItems.map((element, idx) =>
                processFields(nestedFields as Record<string, FieldsNode>, {
                  ...options,
                  bindings: {
                    ...bindings,
                    [mapDir.item ?? 'item']: element,
                    [mapDir.index ?? 'index']: idx,
                  },
                  depth: depth + 1,
                })
              );
            }
          }
        }
      }
    }
  }

  return result;
}

export const dataMapStepDefinition = createServerStepDefinition({
  ...dataMapStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const rawFields = context.rawInput.fields as Record<string, FieldsNode>;

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

      context.logger.debug(
        `Mapping ${itemsArray.length} item(s) with ${Object.keys(rawFields).length} fields`
      );

      const mappedItems = itemsArray.map((currentItem, currentIndex) =>
        processFields(rawFields, {
          renderTemplate: (value, ctx) => context.contextManager.renderInputTemplate(value, ctx),
          bindings: { item: currentItem, index: currentIndex },
        })
      );

      context.logger.debug(`Successfully mapped ${mappedItems.length} item(s)`);

      return { output: shouldReturnObject ? mappedItems[0] : mappedItems };
    } catch (error) {
      context.logger.error('Failed to map items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to map items'),
      };
    }
  },
});
