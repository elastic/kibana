/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { Parser } from '../../../..';
import { UnmappedFieldsStrategy, type ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';
import { additionalFieldsMock } from '../../../__tests__/language/helpers';

describe('INLINESTATS', () => {
  it('gets the columns after the query', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'double', userDefined: false },
      { name: 'buckets', type: 'double', userDefined: false }, // should be overwritten
      { name: '@timestamp', type: 'date', userDefined: false },
    ];

    const queryString = `FROM a | INLINESTATS AVG(field1) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)`;

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
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'AVG(field1)', type: 'double', userDefined: true, location: { min: 21, max: 31 } },
      { name: 'buckets', type: 'date', userDefined: true, location: { min: 36, max: 42 } },
      ...previousCommandFields.filter(({ name }) => name !== 'buckets'),
    ]);
  });
});
