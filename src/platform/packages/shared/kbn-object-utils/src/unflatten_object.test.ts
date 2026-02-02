/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unflattenObject } from './unflatten_object';

describe('unflattenObject', () => {
  it('unflattens deeply nested objects', () => {
    expect(unflattenObject({ 'first.second.third': 'third' })).toEqual({
      first: {
        second: {
          third: 'third',
        },
      },
    });
  });

  it('does not unflatten arrays', () => {
    expect(
      unflattenObject({
        simpleArray: ['0', '1', '2'],
        complexArray: [{ one: 'one', two: 'two', three: 'three' }],
        'nested.array': [0, 1, 2],
        'complex.nested': [{ one: 'one', two: 'two', 'first.second': 'foo', 'first.third': 'bar' }],
      })
    ).toEqual({
      simpleArray: ['0', '1', '2'],
      complexArray: [{ one: 'one', two: 'two', three: 'three' }],
      nested: {
        array: [0, 1, 2],
      },
      complex: {
        nested: [{ one: 'one', two: 'two', first: { second: 'foo', third: 'bar' } }],
      },
    });
  });

  it('handles null values correctly', () => {
    expect(
      unflattenObject({
        'agent.name': null,
      })
    ).toEqual({
      agent: {
        name: null,
      },
    });
  });

  it('handles nested arrays', () => {
    expect(
      unflattenObject({
        nested: [[{ 'first.second': 'foo' }, { 'first.second': 'bar' }]],
        mixed: [[1, 2, { 'first.second': 'foo' }]],
      })
    ).toEqual({
      nested: [[{ first: { second: 'foo' } }, { first: { second: 'bar' } }]],
      mixed: [[1, 2, { first: { second: 'foo' } }]],
    });
  });

  it('unflattens nested flattened objects', () => {
    expect(
      unflattenObject({
        'my.flattened.parent.key': {
          'an.internal.key': 1,
        },
      })
    ).toEqual({
      my: {
        flattened: {
          parent: {
            key: {
              an: {
                internal: {
                  key: 1,
                },
              },
            },
          },
        },
      },
    });
  });
});
