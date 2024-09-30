/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { Type, type } from '.';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('type', () => {
  test('it will work with a given expected type', () => {
    const payload: Type = 'keyword';
    const decoded = type.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given a type that does not exist', () => {
    const payload: Type | 'madeup' = 'madeup';
    const decoded = type.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "madeup" supplied to ""binary" | "boolean" | "byte" | "date" | "date_nanos" | "date_range" | "double" | "double_range" | "float" | "float_range" | "geo_point" | "geo_shape" | "half_float" | "integer" | "integer_range" | "ip" | "ip_range" | "keyword" | "long" | "long_range" | "shape" | "short" | "text""',
    ]);
    expect(message.schema).toEqual({});
  });
});
