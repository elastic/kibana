/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexPatternLoadStartDependencies } from '../../common/expressions';
import { getFunctionDefinition } from './load_index_pattern';

describe('indexPattern expression function', () => {
  let getStartDependencies: () => Promise<IndexPatternLoadStartDependencies>;
  let toSpec: jest.Mock;

  beforeEach(() => {
    toSpec = jest.fn(() => ({
      title: 'value',
    }));
    getStartDependencies = jest.fn().mockResolvedValue({
      indexPatterns: {
        get: (id: string) => ({
          toSpec,
        }),
      },
    });
  });

  test('returns serialized index pattern', async () => {
    const indexPatternDefinition = getFunctionDefinition({ getStartDependencies });
    const result = await indexPatternDefinition().fn(
      null,
      {
        id: '1',
        // default value for includeFields
        includeFields: true,
      },
      {} as any
    );
    expect(toSpec).toHaveBeenCalledWith(true);
    expect(result.type).toEqual('index_pattern');
    expect(result.value.title).toEqual('value');
  });

  test('excludes fields', async () => {
    const indexPatternDefinition = getFunctionDefinition({ getStartDependencies });
    const result = await indexPatternDefinition().fn(
      null,
      { id: '1', includeFields: false },
      {} as any
    );

    expect(toSpec).toHaveBeenCalledWith(false);
    expect(result.type).toEqual('index_pattern');
    expect(result.value.title).toEqual('value');
  });
});
