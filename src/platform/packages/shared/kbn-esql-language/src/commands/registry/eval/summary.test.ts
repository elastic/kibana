/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { summary } from './summary';
import { Parser } from '../../../parser';

describe('EVAL > summary', () => {
  it('identifies user-defined columns from EVAL command', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL baz = foo + 1`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['baz']) });
  });

  it('identifies user-defined columns from EVAL command with function expression', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL baz = ABS(foo)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['baz']) });
  });

  it('identifies automatically created columns from EVAL command', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL ABS(x)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['ABS(x)']) });
  });

  it('identifies automatically created columns from EVAL command with more complex expression', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL ABS(x) + ABS(y + 1)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['ABS(x)+ABS(y+1)']) });
  });
});
