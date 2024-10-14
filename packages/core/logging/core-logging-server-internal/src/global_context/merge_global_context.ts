/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { has } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { LogMeta } from '@kbn/logging';
import { GlobalContext } from './types';

/**
 * Takes a flattened object of {@link GlobalContext} and applies it to the
 * provided {@link LogMeta}.
 *
 * @remarks
 * The provided `LogMeta` takes precedence over the `GlobalContext`;
 * if duplicate keys are found, the `GlobalContext` will be overridden.
 *
 * @example
 * ```ts
 * const meta: LogMeta = {
 *   a: { b: false },
 *   d: 'hi',
 * };
 * const context: GlobalContext = {
 *   'a.b': true,
 *   c: [1, 2, 3],
 * };
 *
 * mergeGlobalContext(context, meta);
 * // {
 * //   a: { b: false },
 * //   c: [1, 2, 3],
 * //   d: 'hi',
 * // }
 * ```
 *
 * @internal
 */
export function mergeGlobalContext(globalContext: GlobalContext, meta?: LogMeta) {
  if (!meta && Object.keys(globalContext).length === 0) {
    return;
  }

  const mergedMeta = meta ?? {};
  for (const [path, data] of Object.entries(globalContext)) {
    if (!has(mergedMeta, path)) {
      set(mergedMeta, path, data);
    }
  }

  return mergedMeta;
}
