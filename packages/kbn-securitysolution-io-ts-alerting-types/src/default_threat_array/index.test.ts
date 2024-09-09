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
import { Threats } from '../threat';
import { DefaultThreatArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_threat_null', () => {
  test('it should validate an empty array', () => {
    const payload: Threats = [];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of threats', () => {
    const payload: Threats = [
      {
        framework: 'MITRE ATTACK',
        technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
        tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA000999' },
      },
    ];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = [
      {
        framework: 'MITRE ATTACK',
        technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
        tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA000999' },
      },
      5,
    ];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultThreatArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default empty array if not provided a value', () => {
    const payload = null;
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
