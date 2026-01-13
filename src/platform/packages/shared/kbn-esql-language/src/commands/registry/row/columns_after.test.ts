/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../../../..';
import type { ESQLUserDefinedColumn } from '../types';

import { columnsAfter } from './columns_after';

describe('ROW > columnsAfter', () => {
  it('adds new user-defined columns', () => {
    const queryString = `ROW baz = 1, foo = FLOOR(2. + 2.), TO_LONG(23 * 4)`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(command, [], queryString);

    expect(result).toEqual<ESQLUserDefinedColumn[]>([
      {
        name: 'baz',
        type: 'integer',
        location: { min: 4, max: 6 },
        userDefined: true,
      },
      {
        name: 'foo',
        type: 'double',
        location: { min: 13, max: 15 },
        userDefined: true,
      },
      {
        name: 'TO_LONG(23 * 4)',
        type: 'long',
        location: { min: 35, max: 49 },
        userDefined: true,
      },
    ]);
  });
});
