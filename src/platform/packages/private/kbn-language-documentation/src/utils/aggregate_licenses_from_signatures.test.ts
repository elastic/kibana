/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Signature } from '../types';
import { aggregateLicensesFromSignatures } from './aggregate_licenses_from_signatures';

describe('aggregateLicensesFromSignatures', () => {
  test('should groups parameter types by license', () => {
    const signatures: Signature[] = [
      {
        license: 'gold',
        params: [
          { name: 'param1', type: 'string' },
          { name: 'param2', type: 'number' },
        ],
      },
      {
        license: 'gold',
        params: [{ name: 'param3', type: 'boolean' }],
      },
      {
        license: 'platinum',
        params: [{ name: 'param4', type: 'string' }],
      },
      {
        license: 'enterprise',
        params: [{ name: 'param5', type: 'object' }],
      },
      {
        license: 'basic',
        params: [{ name: 'param6', type: 'string' }],
      },
      {
        license: 'gold',
        params: [{} as any],
      },
    ];

    const result = aggregateLicensesFromSignatures(signatures);

    expect(result.size).toBe(4);
    expect(result.get('gold')).toEqual(new Set(['string', 'number', 'boolean']));
    expect(result.get('platinum')).toEqual(new Set(['string']));
    expect(result.get('enterprise')).toEqual(new Set(['object']));
    expect(result.get('basic')).toEqual(new Set(['string']));
  });

  test('should returns an empty map when input is empty', () => {
    const result = aggregateLicensesFromSignatures([]);
    expect(result.size).toBe(0);
  });

  test('should handles signatures with empty params', () => {
    const signatures: Signature[] = [
      {
        license: 'gold',
        params: [],
      },
    ];
    const result = aggregateLicensesFromSignatures(signatures);
    expect(result.get('gold')).toEqual(new Set());
  });
});
