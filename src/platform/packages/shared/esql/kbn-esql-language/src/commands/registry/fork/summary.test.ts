/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@elastic/esql';
import { summary as statsSummary } from '../stats/summary';
import type { ESQLCommandSummaryContext } from '../types';
import { summary } from './summary';

const getSubquerySummary = jest.fn<
  ReturnType<ESQLCommandSummaryContext['getSubquerySummary']>,
  Parameters<ESQLCommandSummaryContext['getSubquerySummary']>
>();
const context: ESQLCommandSummaryContext = {
  namedSubqueries: [],
  getSubquerySummary,
};

describe('FORK > summary', () => {
  beforeEach(() => {
    getSubquerySummary.mockReset();
  });

  it('returns _fork column for simple FORK', () => {
    getSubquerySummary.mockReturnValue({ newColumns: new Set() });
    const command = synth.cmd`FORK (LIMIT 10) (LIMIT 1000)`;
    const result = summary(command, '', context);

    expect(result.newColumns).toEqual(new Set(['_fork']));
  });

  it('collects new columns from branches with rename', () => {
    getSubquerySummary
      .mockReturnValueOnce({
        newColumns: new Set(['foo', 'bar']),
        renamedColumnsPairs: new Set([['bar', 'foo']]),
      })
      .mockReturnValueOnce({ newColumns: new Set(['lolz']) });
    const command = synth.cmd`FORK (EVAL foo = 1 | RENAME foo AS bar) (EVAL lolz = 2 + 3)`;
    const result = summary(command, '', context);

    expect(result.newColumns).toEqual(new Set(['_fork', 'foo', 'bar', 'lolz']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['bar', 'foo']]));
  });

  it('collects columns from multiple branches', () => {
    getSubquerySummary
      .mockReturnValueOnce({ newColumns: new Set(['a', 'b']) })
      .mockReturnValueOnce({ newColumns: new Set(['c']) });
    const command = synth.cmd`FORK (EVAL a = 1 | EVAL b = 2) (EVAL c = 3)`;
    const result = summary(command, '', context);

    expect(result.newColumns).toEqual(new Set(['_fork', 'a', 'b', 'c']));
  });

  it('handles STATS', () => {
    getSubquerySummary
      .mockReturnValueOnce(statsSummary(synth.cmd`STATS count = count()`, ''))
      .mockReturnValueOnce(statsSummary(synth.cmd`STATS avg = avg(price)`, ''));
    const command = synth.cmd`FORK (STATS count = count()) (STATS avg = avg(price))`;
    const result = summary(command, '', context);

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
    getSubquerySummary
      .mockReturnValueOnce({
        ...statsSummary(synth.cmd`STATS total = sum(result)`, ''),
        newColumns: new Set(['temp', 'result', 'total']),
        renamedColumnsPairs: new Set([['result', 'temp']]),
      })
      .mockReturnValueOnce({ newColumns: new Set(['x']) });
    const command = synth.cmd`FORK (EVAL temp = 1 | RENAME temp AS result | STATS total = sum(result)) (EVAL x = 2)`;
    const result = summary(command, '', context);

    expect(result.newColumns).toEqual(new Set(['_fork', 'temp', 'result', 'total', 'x']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['result', 'temp']]));
    expect(result.aggregates).toEqual(new Set([expect.objectContaining({ field: 'total' })]));
    expect(result.grouping).toEqual(new Set());
  });
});
