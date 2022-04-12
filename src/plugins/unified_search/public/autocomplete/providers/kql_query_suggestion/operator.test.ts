/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dataViewResponse from './__fixtures__/data_view_response.json';

import { setupGetOperatorSuggestions } from './operator';
import { KueryNode } from '../../../../../data/public';
import { QuerySuggestionGetFnArgs } from '../../index';
import { coreMock } from '../../../../../../core/public/mocks';

const mockKueryNode = (kueryNode: Partial<KueryNode>) => kueryNode as unknown as KueryNode;

describe('Kuery operator suggestions', () => {
  let getSuggestions: ReturnType<typeof setupGetOperatorSuggestions>;
  let querySuggestionsArgs: QuerySuggestionGetFnArgs;

  beforeEach(() => {
    querySuggestionsArgs = {
      dataViews: [dataViewResponse],
    } as unknown as QuerySuggestionGetFnArgs;

    getSuggestions = setupGetOperatorSuggestions(coreMock.createSetup());
  });

  test('should return a function', () => {
    expect(typeof getSuggestions).toBe('function');
  });

  test('should not return suggestions for non-fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'foo' })
    );

    expect(suggestions).toEqual([]);
  });

  test('should return exists for every field', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({
        fieldName: 'custom_user_field',
      })
    );

    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].text).toBe(': * ');
  });

  test('should return equals for string fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'machine.os' })
    );

    expect(suggestions.find(({ text }) => text === ': ')).toBeDefined();
    expect(suggestions.find(({ text }) => text === '< ')).not.toBeDefined();
  });

  test('should return numeric operators for numeric fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'bytes' })
    );

    expect(suggestions.find(({ text }) => text === ': ')).toBeDefined();
    expect(suggestions.find(({ text }) => text === '< ')).toBeDefined();
  });

  test('should return numeric operators for numeric range fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'bytes_range' })
    );

    expect(suggestions.find(({ text }) => text === ': ')).toBeDefined();
    expect(suggestions.find(({ text }) => text === '< ')).toBeDefined();
  });

  test('should return range operators for date range fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'time_range' })
    );

    expect(suggestions.find(({ text }) => text === ': ')).toBeDefined();
    expect(suggestions.find(({ text }) => text === '< ')).toBeDefined();
  });

  test('should return range operators for ip range fields', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'ip_range' })
    );

    expect(suggestions.find(({ text }) => text === ': ')).toBeDefined();
    expect(suggestions.find(({ text }) => text === '< ')).toBeDefined();
  });

  test('should have descriptions', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName: 'bytes' })
    );

    expect(suggestions.length).toBeGreaterThan(0);

    suggestions.forEach((suggestion) => {
      expect(suggestion).toHaveProperty('description');
    });
  });

  test('should handle nested paths', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({
        fieldName: 'child',
        nestedPath: 'nestedField',
      })
    );

    expect(suggestions.length).toBeGreaterThan(0);
  });
});
