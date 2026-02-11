/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { Parser, synth } from '../../../..';
import { UnmappedFieldsStrategy, type ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';
import { additionalFieldsMock } from '../../../__tests__/language/helpers';

describe('STATS', () => {
  const unmappedFieldsStrategy = UnmappedFieldsStrategy.FAIL;
  it('adds the user defined column, when no grouping is given', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`STATS var0=AVG(field2)`,
      previousCommandFields,
      '',
      additionalFieldsMock,
      unmappedFieldsStrategy
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'var0', type: 'double', userDefined: true, location: { min: 0, max: 0 } },
    ]);
  });

  it('adds the escaped column, when no grouping is given', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const queryString = `FROM index | STATS AVG(field2)`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      previousCommandFields,
      queryString,
      additionalFieldsMock,
      unmappedFieldsStrategy
    );

    expect(result).toEqual([
      { name: 'AVG(field2)', type: 'double', userDefined: true, location: { min: 19, max: 29 } },
    ]);
  });

  it('adds the escaped and grouping columns', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const queryString = `FROM a | STATS AVG(field2) BY field1`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      previousCommandFields,
      queryString,
      additionalFieldsMock,
      unmappedFieldsStrategy
    );

    expect(result).toEqual([
      { name: 'AVG(field2)', type: 'double', userDefined: true, location: { min: 15, max: 25 } },
      { name: 'field1', type: 'keyword', userDefined: true, location: { min: 30, max: 35 } },
    ]);
  });

  it('adds the user defined and grouping columns', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
      { name: '@timestamp', type: 'date', userDefined: false },
    ];

    const queryString = `FROM a | STATS AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      previousCommandFields,
      queryString,
      additionalFieldsMock,
      unmappedFieldsStrategy
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'AVG(field2)', type: 'double', userDefined: true, location: { min: 15, max: 25 } },
      { name: 'buckets', type: 'date', userDefined: true, location: { min: 30, max: 36 } },
    ]);
  });

  it('keeps grouping column names unescaped when quoted', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field2', type: 'double', userDefined: false },
      { name: 'ss', type: 'keyword', userDefined: true, location: { min: 0, max: 0 } },
    ];

    const queryString = `FROM a | STATS AVG(field2) BY \`ss\``;

    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      previousCommandFields,
      queryString,
      additionalFieldsMock,
      unmappedFieldsStrategy
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'AVG(field2)', type: 'double', userDefined: true, location: { min: 15, max: 25 } },
      { name: 'ss', type: 'keyword', userDefined: true, location: { min: 30, max: 33 } },
    ]);
  });
});
