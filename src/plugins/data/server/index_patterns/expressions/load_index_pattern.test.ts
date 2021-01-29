/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPatternLoadStartDependencies } from '../../../common/index_patterns/expressions';
import { getFunctionDefinition } from './load_index_pattern';

describe('indexPattern expression function', () => {
  let getStartDependencies: () => Promise<IndexPatternLoadStartDependencies>;

  beforeEach(() => {
    getStartDependencies = jest.fn().mockResolvedValue({
      indexPatterns: {
        get: (id: string) => ({
          toSpec: () => ({
            title: 'value',
          }),
        }),
      },
    });
  });

  test('returns serialized index pattern', async () => {
    const indexPatternDefinition = getFunctionDefinition({ getStartDependencies });
    const result = await indexPatternDefinition().fn(null, { id: '1' }, {
      getKibanaRequest: () => ({}),
    } as any);
    expect(result.type).toEqual('index_pattern');
    expect(result.value.title).toEqual('value');
  });

  test('throws if getKibanaRequest is not available', async () => {
    const indexPatternDefinition = getFunctionDefinition({ getStartDependencies });
    expect(async () => {
      await indexPatternDefinition().fn(null, { id: '1' }, {} as any);
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"A KibanaRequest is required to execute this search on the server. Please provide a request object to the expression execution params."`
    );
  });
});
