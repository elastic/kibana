/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenToAttributes } from './flatten_to_attributes';

describe('flattenToAttributes', () => {
  it('flattens a nested object with primitives correctly', () => {
    const input = {
      user: {
        id: 1,
        info: {
          name: 'bob',
          active: true,
        },
      },
      version: '1.0.0',
    };

    const expected = {
      'user.id': 1,
      'user.info.name': 'bob',
      'user.info.active': true,
      version: '1.0.0',
    };

    expect(flattenToAttributes(input)).toEqual(expected);
  });

  it('flattens arrays and deeply-nested structures', () => {
    const input = {
      arr: [1, 2],
      complex: {
        nestedArr: [{ label: 'a' }, { label: 'b' }],
      },
    };

    const expected = {
      'arr.0': 1,
      'arr.1': 2,
      'complex.nestedArr.0.label': 'a',
      'complex.nestedArr.1.label': 'b',
    };

    expect(flattenToAttributes(input)).toEqual(expected);
  });
});
