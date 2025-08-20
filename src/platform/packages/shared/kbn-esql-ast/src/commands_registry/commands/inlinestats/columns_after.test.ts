/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import { columnsAfter } from './columns_after';

// Test data fixtures
const createPreviousFields = (fields: Array<[string, string]>): ESQLFieldWithMetadata[] =>
  fields.map(([name, type]) => ({ name, type } as ESQLFieldWithMetadata));

describe('INLINESTATS', () => {
  const createUserDefinedColumn = (
    name: string,
    type: ESQLFieldWithMetadata['type'],
    location = { min: 0, max: 10 }
  ): ESQLUserDefinedColumn => ({ name, type, location });

  const createContext = (userDefinedColumns: Array<[string, ESQLUserDefinedColumn[]]> = []) => ({
    userDefinedColumns: new Map(userDefinedColumns),
    fields: new Map<string, ESQLFieldWithMetadata>([
      ['field1', { name: 'field1', type: 'keyword' }],
      ['count', { name: 'count', type: 'double' }],
    ]),
  });

  const expectColumnsAfter = (
    command: string,
    previousFields: ESQLFieldWithMetadata[],
    userColumns: Array<[string, string]>,
    expectedResult: Array<[string, string]>
  ) => {
    const context = createContext(
      userColumns.map(([name, type]) => [name, [createUserDefinedColumn(name, type as 'keyword')]])
    );
    const result = columnsAfter(synth.cmd(command), previousFields, context);
    const expected = createPreviousFields(expectedResult);
    expect(result).toEqual(expected);
  };
  it('preserves all previous columns and adds the user defined column, when no grouping is given', () => {
    const previousFields = createPreviousFields([
      ['field1', 'keyword'],
      ['field2', 'double'],
    ]);

    expectColumnsAfter(
      'INLINESTATS var0=AVG(field2)',
      previousFields,
      [['var0', 'double']],
      [
        ['field1', 'keyword'],
        ['field2', 'double'],
        ['var0', 'double'],
      ]
    );
  });

  it('preserves all previous columns and adds the escaped column, when no grouping is given', () => {
    const previousFields = createPreviousFields([
      ['field1', 'keyword'],
      ['field2', 'double'],
    ]);

    expectColumnsAfter(
      'INLINESTATS AVG(field2)',
      previousFields,
      [['AVG(field2)', 'double']],
      [
        ['field1', 'keyword'],
        ['field2', 'double'],
        ['AVG(field2)', 'double'],
      ]
    );
  });

  it('preserves all previous columns and adds the escaped column, with grouping', () => {
    const previousFields = createPreviousFields([
      ['field1', 'keyword'],
      ['field2', 'double'],
    ]);

    // Note: Unlike STATS, INLINESTATS doesn't care about BY clause for column preservation
    expectColumnsAfter(
      'INLINESTATS AVG(field2) BY field1',
      previousFields,
      [['AVG(field2)', 'double']],
      [
        ['field1', 'keyword'],
        ['field2', 'double'],
        ['AVG(field2)', 'double'],
      ]
    );
  });

  it('preserves all previous columns and adds user defined and grouping columns', () => {
    const previousFields = createPreviousFields([
      ['field1', 'keyword'],
      ['field2', 'double'],
      ['@timestamp', 'date'],
    ]);

    expectColumnsAfter(
      'INLINESTATS AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)',
      previousFields,
      [
        ['AVG(field2)', 'double'],
        ['buckets', 'unknown'],
      ],
      [
        ['field1', 'keyword'],
        ['field2', 'double'],
        ['@timestamp', 'date'],
        ['AVG(field2)', 'double'],
        ['buckets', 'unknown'],
      ]
    );
  });

  it('handles duplicate column names by keeping the original column type', () => {
    const previousFields = createPreviousFields([
      ['field1', 'keyword'],
      ['field2', 'double'],
      ['avg_field', 'integer'], // This will be preserved since it comes first
    ]);

    expectColumnsAfter(
      'INLINESTATS avg_field=AVG(field2)',
      previousFields,
      [['avg_field', 'double']], // This will be ignored due to duplicate name
      [
        ['field1', 'keyword'],
        ['field2', 'double'],
        ['avg_field', 'integer'],
      ]
    );
  });
});
