/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataConcatStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const MAX_CONCAT_ITEMS = 100_000;
export const MAX_ARRAYS = 50;
const MAX_FLATTEN_DEPTH = 10;
const ABORT_CHECK_INTERVAL = 1000;

function resolveArrays(raw: unknown[], renderFn: (val: unknown) => unknown): unknown[][] {
  return raw.map((item, i) => {
    const rendered = renderFn(item);
    if (rendered === null || rendered === undefined) {
      return [];
    }
    if (!Array.isArray(rendered)) {
      throw new Error(
        `Input at index ${i} is not an array (got ${typeof rendered}). Each entry in "arrays" must resolve to an array.`
      );
    }
    return rendered;
  });
}

function deduplicateKey(item: unknown): string {
  if (item === null) return 'null';
  if (item === undefined) return 'undefined';
  const t = typeof item;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return `${t}:${item}`;
  }
  return JSON.stringify(item);
}

function deduplicateItems(items: unknown[], abortSignal?: AbortSignal): unknown[] {
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i % ABORT_CHECK_INTERVAL === 0 && abortSignal?.aborted) {
      break;
    }
    const key = deduplicateKey(items[i]);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(items[i]);
    }
  }
  return result;
}

export const dataConcatStepDefinition = createServerStepDefinition({
  ...dataConcatStepCommonDefinition,
  handler: async (context) => {
    try {
      const rawArrays = context.config.arrays;
      const { dedupe, flatten } = context.input;

      if (!Array.isArray(rawArrays) || rawArrays.length === 0) {
        return { error: new Error('"arrays" must be a non-empty array of arrays') };
      }

      if (rawArrays.length > MAX_ARRAYS) {
        return {
          error: new Error(
            `Too many input arrays (${rawArrays.length}). Maximum allowed is ${MAX_ARRAYS}.`
          ),
        };
      }

      const resolved = resolveArrays(rawArrays, (val) =>
        context.contextManager.renderInputTemplate(val)
      );

      let result: unknown[] = ([] as unknown[]).concat(...resolved);

      if (result.length > MAX_CONCAT_ITEMS) {
        return {
          error: new Error(
            `Concatenated result has ${result.length} items, exceeding the maximum of ${MAX_CONCAT_ITEMS}.`
          ),
        };
      }

      if (flatten) {
        const depth = typeof flatten === 'number' ? Math.min(flatten, MAX_FLATTEN_DEPTH) : 1;
        result = result.flat(depth);

        if (result.length > MAX_CONCAT_ITEMS) {
          return {
            error: new Error(
              `Flattened result has ${result.length} items, exceeding the maximum of ${MAX_CONCAT_ITEMS}.`
            ),
          };
        }
      }

      if (dedupe) {
        result = deduplicateItems(result, context.abortSignal);
      }

      context.logger.debug(
        `Concatenated ${resolved.length} arrays into ${result.length} items (flatten: ${flatten}, dedupe: ${dedupe})`
      );

      return { output: result };
    } catch (error) {
      context.logger.error('Failed to concatenate arrays', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to concatenate arrays'),
      };
    }
  },
});
