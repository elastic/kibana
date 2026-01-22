/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { Parser } from '../../../parser';
import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions } from '../../../__tests__/commands/autocomplete';
import { UnmappedFieldsStrategy, type ESQLColumnData, type ICommandCallbacks } from '../types';
import { columnsAfter } from './columns_after';
import { columnsAfter as statsColumnsAfter } from '../stats/columns_after';
import { additionalFieldsMock } from '../../../__tests__/language/helpers';

const inlineStatsExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'inline stats',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('INLINE STATS Multi-token Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = getMockCallbacks();
  });

  describe('Multi-token command recognition', () => {
    test('suggests STATS when typing "INLINE " with space', async () => {
      await inlineStatsExpectSuggestions('FROM a | INLINE ', ['STATS '], mockCallbacks);
    });

    test('suggests STATS when typing partial "INLINE S"', async () => {
      await inlineStatsExpectSuggestions('FROM a | INLINE S', ['STATS '], mockCallbacks);
    });
  });

  it('preserves original columns unlike regular STATS', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'double', userDefined: false },
      { name: 'field2', type: 'keyword', userDefined: false },
      { name: '@timestamp', type: 'date', userDefined: false },
    ];

    const queryString = `FROM a | INLINE STATS avg_field1 = AVG(field1)`;
    const statsQueryString = `FROM a | STATS avg_field1 = AVG(field1)`;

    const {
      root: {
        commands: [, inlineStatsCommand],
      },
    } = Parser.parse(queryString);

    const {
      root: {
        commands: [, statsCommand],
      },
    } = Parser.parseQuery(statsQueryString);

    const inlineStatsResult = columnsAfter(
      inlineStatsCommand,
      previousCommandFields,
      queryString,
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );
    const statsResult = statsColumnsAfter(
      statsCommand,
      previousCommandFields,
      statsQueryString,
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(inlineStatsResult).toEqual<ESQLColumnData[]>([
      { name: 'avg_field1', type: 'double', userDefined: true, location: { min: 22, max: 31 } },
      { name: 'field1', type: 'double', userDefined: false },
      { name: 'field2', type: 'keyword', userDefined: false },
      { name: '@timestamp', type: 'date', userDefined: false },
    ]);

    expect(statsResult).toEqual<ESQLColumnData[]>([
      { name: 'avg_field1', type: 'double', userDefined: true, location: { min: 15, max: 24 } },
    ]);
  });
});
