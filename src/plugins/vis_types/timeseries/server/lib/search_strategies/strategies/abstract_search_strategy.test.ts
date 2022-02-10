/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService } from '../../../../../../data/common';
import { from } from 'rxjs';

import { AbstractSearchStrategy, EsSearchRequest } from './abstract_search_strategy';
import type { FieldSpec } from '../../../../../../data/common';
import type { CachedIndexPatternFetcher } from '../lib/cached_index_pattern_fetcher';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';

class FooSearchStrategy extends AbstractSearchStrategy {}

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy: AbstractSearchStrategy;
  let mockedFields: FieldSpec[];
  let requestContext: VisTypeTimeseriesRequestHandlerContext;

  beforeEach(() => {
    mockedFields = [];
    requestContext = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: jest.fn(),
          },
        },
        uiSettings: {
          client: jest.fn(),
        },
      },
      search: {
        search: jest.fn().mockReturnValue(from(Promise.resolve({}))),
      },
    } as unknown as VisTypeTimeseriesRequestHandlerContext;
    abstractSearchStrategy = new FooSearchStrategy();
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(
      { indexPatternString: '', indexPattern: undefined },
      {
        getDefault: jest.fn(),
        getFieldsForWildcard: jest.fn(() => Promise.resolve(mockedFields)),
      } as unknown as IndexPatternsService,
      (() => Promise.resolve({}) as unknown) as CachedIndexPatternFetcher
    );

    expect(fields).toEqual(mockedFields);
  });

  test('should return response', async () => {
    const searches: EsSearchRequest[] = [{ body: {}, index: 'index' }];

    const responses = await abstractSearchStrategy.search(
      requestContext,
      {
        body: {
          searchSession: {
            sessionId: '1',
            isRestore: false,
            isStored: true,
          },
        },
        events: {
          aborted$: from([]),
        },
      } as unknown as VisTypeTimeseriesVisDataRequest,
      searches
    );

    expect(responses).toEqual([{}]);
    expect(requestContext.search.search).toHaveBeenCalledWith(
      {
        params: {
          body: {},
          index: 'index',
        },
        indexType: undefined,
      },
      {
        abortSignal: new AbortController().signal,
        sessionId: '1',
        isRestore: false,
        isStored: true,
      }
    );
  });
});
