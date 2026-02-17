/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import { summary } from './summary';

describe('FORK > summary', () => {
  it('returns _fork column for simple FORK', () => {
    const command = synth.cmd`FORK (LIMIT 10) (LIMIT 1000)`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_fork']));
  });

  it('collects new columns from branches with rename', () => {
    const command = synth.cmd`FORK (EVAL foo = 1 | RENAME foo AS bar) (EVAL lolz = 2 + 3)`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_fork', 'foo', 'bar', 'lolz']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['bar', 'foo']]));
  });

  it('collects columns from multiple branches', () => {
    const command = synth.cmd`FORK (EVAL a = 1 | EVAL b = 2) (EVAL c = 3)`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_fork', 'a', 'b', 'c']));
  });

  it('handles STATS', () => {
    const command = synth.cmd`FORK (STATS count = count()) (STATS avg = avg(price))`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_fork', 'count', 'avg']));
    expect(result.aggregates).toEqual(
      new Set([
        expect.objectContaining({ field: 'count' }),
        expect.objectContaining({ field: 'avg' }),
      ])
    );
    expect(result.grouping).toEqual(new Set());
  });

  it('handles more complex scenarios', () => {
    const command = synth.cmd`FORK (EVAL temp = 1 | RENAME temp AS result | STATS total = sum(result)) (EVAL x = 2)`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_fork', 'temp', 'result', 'total', 'x']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['result', 'temp']]));
    expect(result.aggregates).toEqual(new Set([expect.objectContaining({ field: 'total' })]));
    expect(result.grouping).toEqual(new Set());
  });
});
