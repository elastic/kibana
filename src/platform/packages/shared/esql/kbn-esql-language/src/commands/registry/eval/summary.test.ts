/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { summary } from './summary';
import { Parser } from '@elastic/esql';

describe('EVAL > summary', () => {
  it('identifies user-defined columns from EVAL command', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL baz = foo + 1`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['baz']), renamedColumnsPairs: new Set() });
  });

  it('identifies user-defined columns from EVAL command with function expression', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL baz = ABS(foo)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['baz']), renamedColumnsPairs: new Set() });
  });

  it('identifies automatically created columns from EVAL command', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL ABS(x)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({ newColumns: new Set(['ABS(x)']), renamedColumnsPairs: new Set() });
  });

  it('identifies automatically created columns from EVAL command with more complex expression', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL ABS(x) + ABS(y + 1)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({
      newColumns: new Set(['ABS(x)+ABS(y+1)']),
      renamedColumnsPairs: new Set(),
    });
  });

  it('EVAL new = old is treated as a rename', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL new_name = old_name`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({
      newColumns: new Set(['new_name']),
      renamedColumnsPairs: new Set([['new_name', 'old_name']]),
    });
  });

  it('EVAL new = old captures multiple renames', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL a = x, b = y`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({
      newColumns: new Set(['a', 'b']),
      renamedColumnsPairs: new Set([
        ['a', 'x'],
        ['b', 'y'],
      ]),
    });
  });

  it('EVAL new = func(...) is not a rename', async () => {
    const { root } = Parser.parse(`FROM logs | EVAL new_name = ABS(old_name)`);
    const command = root.commands[1];
    const result = summary(command, '');

    expect(result).toEqual({
      newColumns: new Set(['new_name']),
      renamedColumnsPairs: new Set(),
    });
  });
});
