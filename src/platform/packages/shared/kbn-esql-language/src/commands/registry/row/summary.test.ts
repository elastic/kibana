/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '../../../..';
import { summary } from './summary';

describe('ROW summary', () => {
  it('returns new columns for assignments', () => {
    const queryString = `ROW baz = 1, foo = 2`;
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['baz', 'foo']));
  });

  it('returns new columns for expressions without assignment', () => {
    const queryString = `ROW TO_LONG(23 * 4)`;
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['TO_LONG(23 * 4)']));
  });

  it('returns new columns for mixed assignments and expressions', () => {
    const queryString = `ROW baz = 1, foo = FLOOR(2. + 2.), TO_LONG(23 * 4)`;
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['baz', 'foo', 'TO_LONG(23 * 4)']));
  });
});
