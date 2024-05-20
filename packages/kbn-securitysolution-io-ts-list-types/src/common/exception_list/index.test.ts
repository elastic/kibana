/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exceptionListType, ExceptionListTypeEnum } from '.';

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('exceptionListType', () => {
  test('it should validate for "detection"', () => {
    const payload = 'detection';
    const decoded = exceptionListType.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate for "rule_default"', () => {
    const payload = 'rule_default';
    const decoded = exceptionListType.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate for "endpoint"', () => {
    const payload = 'endpoint';
    const decoded = exceptionListType.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should contain same amount of keys as enum', () => {
    // Might seem like a weird test, but its meant to
    // ensure that if exceptionListType is updated, you
    // also update the ExceptionListTypeEnum, a workaround
    // for io-ts not yet supporting enums
    // https://github.com/gcanti/io-ts/issues/67
    const keys = Object.keys(exceptionListType.keys).sort().join(',').toLowerCase();
    const enumKeys = Object.keys(ExceptionListTypeEnum).sort().join(',').toLowerCase();

    expect(keys).toEqual(enumKeys);
  });
});
