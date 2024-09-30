/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { merge as lodashMerge } from 'lodash';
import { isLeft } from 'fp-ts/lib/Either';

type PlainObject = Record<string | number | symbol, any>;

type DeepMerge<T, U> = U extends PlainObject
  ? T extends PlainObject
    ? Omit<T, keyof U> & {
        [key in keyof U]: T extends { [k in key]: any } ? DeepMerge<T[key], U[key]> : U[key];
      }
    : U
  : U;

// this is similar to t.intersection, but does a deep merge
// instead of a shallow merge

export type MergeType<T1 extends t.Any, T2 extends t.Any> = t.Type<
  DeepMerge<t.TypeOf<T1>, t.TypeOf<T2>>,
  DeepMerge<t.OutputOf<T1>, t.OutputOf<T2>>
> & {
  _tag: 'MergeType';
  types: [T1, T2];
};

export function mergeRt<T1 extends t.Any, T2 extends t.Any>(a: T1, b: T2): MergeType<T1, T2>;

export function mergeRt(...types: t.Any[]) {
  const mergeType = new t.Type(
    'merge',
    (u): u is unknown => {
      return types.every((type) => type.is(u));
    },
    (input, context) => {
      const errors: t.Errors = [];

      const successes: unknown[] = [];

      const results = types.map((type, index) =>
        type.validate(
          input,
          context.concat({
            key: String(index),
            type,
            actual: input,
          })
        )
      );

      results.forEach((result) => {
        if (isLeft(result)) {
          errors.push(...result.left);
        } else {
          successes.push(result.right);
        }
      });

      const mergedValues = lodashMerge({}, ...successes);

      return errors.length > 0 ? t.failures(errors) : t.success(mergedValues);
    },
    (a) => types.reduce((val, type) => type.encode(val), a)
  );

  return {
    ...mergeType,
    _tag: 'MergeType',
    types,
  };
}
