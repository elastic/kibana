/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stableStringify } from '@kbn/std';
import { dataConcatStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const MAX_CONCAT_ITEMS = 100_000;
const ABORT_CHECK_INTERVAL = 1000;

function deduplicateKey(item: unknown): string {
  if (item === undefined) return 'undefined';
  return stableStringify(item);
}

function* flattenIterator(arr: unknown[], depth: number): Generator<unknown> {
  for (const item of arr) {
    if (depth > 0 && Array.isArray(item)) {
      yield* flattenIterator(item, depth - 1);
    } else {
      yield item;
    }
  }
}

function resolveToArray(rendered: unknown, index: number): unknown[] {
  if (rendered === null || rendered === undefined) return [];
  if (!Array.isArray(rendered)) {
    throw new Error(
      `Input at index ${index} is not an array (got ${typeof rendered}). Each entry in "arrays" must resolve to an array.`
    );
  }
  return rendered;
}

interface ConcatOptions {
  flattenDepth: number;
  dedupe: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Single-pass: resolve → flatten → dedupe → push, one item at a time.
 * Only the final result array (and optionally a dedup Set) are held in memory.
 */
function concatSinglePass(
  rawArrays: unknown[],
  renderFn: (val: unknown) => unknown,
  options: ConcatOptions
): { result: unknown[] } | { error: Error } {
  const { flattenDepth, dedupe, abortSignal } = options;
  const seen = dedupe ? new Set<string>() : null;
  const result: unknown[] = [];
  let totalCount = 0;

  for (let i = 0; i < rawArrays.length; i++) {
    const resolved = resolveToArray(renderFn(rawArrays[i]), i);
    const items = flattenDepth > 0 ? flattenIterator(resolved, flattenDepth) : resolved;

    for (const item of items) {
      if (totalCount % ABORT_CHECK_INTERVAL === 0 && abortSignal?.aborted) {
        return { error: new Error('Operation was aborted') };
      }

      totalCount++;
      if (totalCount > MAX_CONCAT_ITEMS) {
        return {
          error: new Error(`Result exceeds the maximum of ${MAX_CONCAT_ITEMS} items.`),
        };
      }

      if (seen) {
        const key = deduplicateKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      } else {
        result.push(item);
      }
    }
  }

  return { result };
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

      const flattenDepth = flatten ? (typeof flatten === 'number' ? flatten : 1) : 0;

      const outcome = concatSinglePass(
        rawArrays,
        (val) => context.contextManager.renderInputTemplate(val),
        { flattenDepth, dedupe, abortSignal: context.abortSignal }
      );

      if ('error' in outcome) {
        return { error: outcome.error };
      }

      context.logger.debug(
        `Concatenated ${rawArrays.length} arrays into ${outcome.result.length} items (flatten: ${flatten}, dedupe: ${dedupe})`
      );

      return { output: outcome.result };
    } catch (error) {
      context.logger.error('Failed to concatenate arrays', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to concatenate arrays'),
      };
    }
  },
});
