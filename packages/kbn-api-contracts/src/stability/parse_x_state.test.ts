/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseXState } from './parse_x_state';

describe('parseXState', () => {
  test.each([
    {
      name: 'Generally available -> stable',
      input: 'Generally available',
      expected: { tier: 'stable' },
    },
    {
      name: 'Technical Preview -> tech_preview',
      input: 'Technical Preview',
      expected: { tier: 'tech_preview' },
    },
    {
      name: 'Experimental -> experimental',
      input: 'Experimental',
      expected: { tier: 'experimental' },
    },
    {
      name: 'Generally available with since',
      input: 'Generally available; added in 8.0.0',
      expected: { tier: 'stable', since: '8.0.0' },
    },
    {
      name: 'Technical Preview with since',
      input: 'Technical Preview; added in 9.4.0',
      expected: { tier: 'tech_preview', since: '9.4.0' },
    },
    {
      name: 'Experimental with since',
      input: 'Experimental; added in 8.15.0',
      expected: { tier: 'experimental', since: '8.15.0' },
    },
    {
      name: 'bare Added in with no tier prefix -> stable with since',
      input: 'Added in 9.4.0',
      expected: { tier: 'stable', since: '9.4.0' },
    },
    {
      name: 'undefined -> stable',
      input: undefined,
      expected: { tier: 'stable' },
    },
    {
      name: 'empty string -> stable',
      input: '',
      expected: { tier: 'stable' },
    },
    {
      name: 'unrecognized x-state -> stable',
      input: 'some unknown value',
      expected: { tier: 'stable' },
    },
  ])('$name', ({ input, expected }) => {
    expect(parseXState(input)).toEqual(expected);
  });
});
