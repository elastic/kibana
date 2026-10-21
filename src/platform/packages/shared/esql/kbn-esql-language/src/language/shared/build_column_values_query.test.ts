/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, EsqlQuery } from '@elastic/esql';
import { buildColumnValuesQuery } from './build_column_values_query';

const build = (
  query: string,
  columnName: string,
  options?: Parameters<typeof buildColumnValuesQuery>[2]
) =>
  BasicPrettyPrinter.print(
    buildColumnValuesQuery(EsqlQuery.fromSrc(query).ast, columnName, options)
  );

describe('buildColumnValuesQuery', () => {
  it('limits the source and appends a distinct values sub-pipeline', () => {
    expect(
      build('FROM kibana_sample_data_logs | SORT timestamp DESC | RENAME clientip  AS ds', 'ds')
    ).toBe(
      'FROM kibana_sample_data_logs | LIMIT 10000 | SORT timestamp DESC | RENAME clientip AS ds | STATS BY ds | SORT ds | LIMIT 20'
    );
  });

  it('works with a source-only query', () => {
    expect(build('FROM logs', 'host.name')).toBe(
      'FROM logs | LIMIT 10000 | STATS BY host.name | SORT host.name | LIMIT 20'
    );
  });

  it('escapes column names', () => {
    expect(build('FROM logs', 'my field')).toBe(
      'FROM logs | LIMIT 10000 | STATS BY `my field` | SORT `my field` | LIMIT 20'
    );
  });

  it('respects custom sizes', () => {
    expect(build('FROM logs', 'a', { sampleSize: 500, limit: 5 })).toBe(
      'FROM logs | LIMIT 500 | STATS BY a | SORT a | LIMIT 5'
    );
  });
});
