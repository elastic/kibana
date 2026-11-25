/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { suggest, validateQuery } from '../../../..';
import { QueryColumns } from '../../../query_columns_service';

describe('DESCRIBE editor support', () => {
  it('suggests DESCRIBE after a pipe', async () => {
    const query = 'ROW input = 1 | ';
    const suggestions = await suggest(query, query.length);

    expect(suggestions).toContainEqual(expect.objectContaining({ text: 'DESCRIBE ' }));
  });

  it('suggests schema columns after DESCRIBE', async () => {
    const query = 'ROW input = 1 | DESCRIBE | KEEP ';
    const suggestions = (await suggest(query, query.length)).map(({ text }) => text);

    expect(suggestions).toEqual(expect.arrayContaining(['name', 'type']));
    expect(suggestions).not.toContain('input');
  });

  it('replaces the input columns and prevents unmapped fields from being added downstream', async () => {
    const query = 'SET unmapped_fields="LOAD"; ROW input = 1 | DESCRIBE';
    const { root, errors } = Parser.parse(query);
    expect(errors).toEqual([]);
    const columns = await new QueryColumns(root, query).byType();

    expect(columns.map(({ name }) => name)).toEqual([
      'name',
      'type',
      'role',
      'field',
      'origin',
      'metric_type',
      'unit',
      'interval',
      'time_zone',
      'description',
    ]);
    expect(columns.every(({ type }) => type === 'keyword')).toBe(true);

    const callbacks = { getColumnsFor: () => Promise.resolve([]) };
    expect((await validateQuery(`${query} | KEEP name, type`, callbacks)).errors).toEqual([]);
    expect((await validateQuery(`${query} | KEEP input`, callbacks)).errors).toEqual([
      expect.objectContaining({ code: 'unknownColumn', text: 'Unknown column "input"' }),
    ]);
  });
});
