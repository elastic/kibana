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
  it('validates DESCRIBE as a processing command with no arguments', async () => {
    expect((await validateQuery('ROW input = 1 | DESCRIBE')).errors).toEqual([]);
    expect((await validateQuery('ROW input = 1 | DESCRIBE input')).errors).not.toHaveLength(0);
    expect((await validateQuery('DESCRIBE')).errors).not.toHaveLength(0);
  });

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

  it.each([
    'SET unmapped_fields="LOAD"; LET schema = (FROM logs | DESCRIBE); FROM schema',
    'SET unmapped_fields="LOAD"; FROM (FROM logs | DESCRIBE)',
    'SET unmapped_fields="LOAD"; FROM (FROM logs | FORK (DESCRIBE) (STATS n = COUNT(*)))',
  ])('rejects unknown schema columns after %s', async (query) => {
    const callbacks = { getColumnsFor: () => Promise.resolve([]) };

    expect((await validateQuery(`${query} | KEEP name`, callbacks)).errors).toEqual([]);
    expect((await validateQuery(`${query} | KEEP message`, callbacks)).errors).toEqual([
      expect.objectContaining({ code: 'unknownColumn', text: 'Unknown column "message"' }),
    ]);

    const filterQuery = `${query} | WHERE message IS NULL`;
    const { root } = Parser.parse(filterQuery);
    const columns = await new QueryColumns(root, filterQuery, callbacks).byType();
    expect(columns.map(({ name }) => name)).not.toContain('message');
  });

  it('still loads unmapped columns after a plain STATS subquery', async () => {
    const query =
      'SET unmapped_fields="LOAD"; FROM (FROM logs | STATS n = COUNT(*)) | WHERE message IS NULL';
    const callbacks = { getColumnsFor: () => Promise.resolve([]) };
    const { root } = Parser.parse(query);

    expect((await validateQuery(query, callbacks)).errors).toEqual([]);
    const columns = await new QueryColumns(root, query, callbacks).byType();
    expect(columns.map(({ name }) => name)).toContain('message');
  });
});
