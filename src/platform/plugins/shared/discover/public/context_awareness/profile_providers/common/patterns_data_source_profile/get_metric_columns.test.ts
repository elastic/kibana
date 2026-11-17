/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMetricColumns } from './get_metric_columns';

const query =
  'FROM logs | STATS count = COUNT(*), trend = SPARKLINE(COUNT(*), @timestamp), average = AVG(bytes) BY Pattern = CATEGORIZE(message)';

describe('getMetricColumns', () => {
  it.each([
    ['', ['count', 'trend']],
    [' | SORT count DESC | LIMIT 10 | WHERE count > 1', ['count', 'trend']],
    [' | RENAME count AS total | RENAME total AS occurrences', ['trend', 'occurrences']],
    [' | KEEP Pattern, count', ['count']],
    [' | DROP trend', ['count']],
    [' | DROP count | RENAME average AS count', ['trend']],
    [' | KEEP Pattern, average | RENAME average AS count', []],
    [' | RENAME average AS count', ['trend']],
    [' | EVAL count = TO_STRING(count)', []],
    [' | EVAL unrelated = 1', []],
    [' | STATS count = SUM(count) BY Pattern', []],
    [' | KEEP *', []],
    [' | DROP c*', []],
    [' | RENAME c* AS total*', []],
    [' | FORK (WHERE count > 1) (WHERE count <= 1)', []],
  ])('tracks metric outputs through %s', (suffix, expected) => {
    expect(getMetricColumns(query + suffix)).toEqual(expected);
  });

  it('recognizes mixed case functions and quoted aliases', () => {
    expect(
      getMetricColumns(
        'FROM logs | STATS `event count` = cOuNt(*), `event trend` = sPaRkLiNe(COUNT(*), @timestamp) BY Pattern = CATEGORIZE(message)'
      )
    ).toEqual(['event count', 'event trend']);
  });

  it('preserves source spelling and whitespace for unaliased outputs', () => {
    expect(
      getMetricColumns(
        'FROM logs | STATS COUNT(*), SPARKLINE(COUNT(*), @timestamp) BY Pattern = CATEGORIZE(message)'
      )
    ).toEqual(['COUNT(*)', 'SPARKLINE(COUNT(*), @timestamp)']);
  });

  it('renames unaliased counts containing a literal asterisk', () => {
    expect(
      getMetricColumns(
        'FROM logs | STATS COUNT(*) BY Pattern = CATEGORIZE(message) | RENAME `COUNT(*)` AS total'
      )
    ).toEqual(['total']);
  });

  it('ignores renames before the aggregation', () => {
    expect(
      getMetricColumns(
        'FROM logs | RENAME count AS old_count | STATS count = COUNT(*) BY Pattern = CATEGORIZE(message)'
      )
    ).toEqual(['count']);
  });

  it('does not infer counts from arithmetic or other aggregations', () => {
    expect(
      getMetricColumns(
        'FROM logs | STATS rate = COUNT(*) / 10, count = AVG(bytes) BY Pattern = CATEGORIZE(message)'
      )
    ).toEqual([]);
  });

  it.each(['FROM logs', 'FROM logs | STATS count ='])(
    'ignores unsupported or invalid queries: %s',
    (esql) => {
      expect(getMetricColumns(esql)).toEqual([]);
    }
  );
});
