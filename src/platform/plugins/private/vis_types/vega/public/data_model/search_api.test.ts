/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extendSearchParamsWithRuntimeFields, SearchAPI } from './search_api';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { searchResponseBody } from '@kbn/data-plugin/common';
import { of } from 'rxjs';

import type { getSearchParamsFromRequest } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

const mockComputedFields = (
  dataViewsStart: DataViewsPublicPluginStart,
  index: string,
  runtimeFields: Record<string, unknown>
) => {
  dataViewsStart.find = jest.fn().mockReturnValue([
    {
      title: index,
      getComputedFields: () => ({
        runtimeFields,
      }),
      getRuntimeMappings: () => runtimeFields,
    },
  ]);
};

describe('extendSearchParamsWithRuntimeFields', () => {
  let dataViewsStart: DataViewsPublicPluginStart;

  beforeEach(() => {
    dataViewsStart = dataViewPluginMocks.createStartContract();
  });

  test('should inject default runtime_mappings for known indexes', async () => {
    const requestParams = {};
    const runtimeFields = { foo: {} };

    mockComputedFields(dataViewsStart, 'index', runtimeFields);

    expect(await extendSearchParamsWithRuntimeFields(dataViewsStart, requestParams, 'index'))
      .toMatchInlineSnapshot(`
      Object {
        "runtime_mappings": Object {
          "foo": Object {},
        },
      }
    `);
  });

  test('should use runtime mappings from spec if it is specified', async () => {
    const requestParams = {
      runtime_mappings: {
        test: {},
      },
    } as unknown as ReturnType<typeof getSearchParamsFromRequest>;
    const runtimeFields = { foo: {} };

    mockComputedFields(dataViewsStart, 'index', runtimeFields);

    expect(await extendSearchParamsWithRuntimeFields(dataViewsStart, requestParams, 'index'))
      .toMatchInlineSnapshot(`
      Object {
        "runtime_mappings": Object {
          "test": Object {},
        },
      }
    `);
  });
});

describe('SearchAPI projectRouting', () => {
  let mockSearch: jest.Mock;
  let dataViewsStart: DataViewsPublicPluginStart;
  let mockDependencies: any;

  beforeEach(() => {
    dataViewsStart = dataViewPluginMocks.createStartContract();
    mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: searchResponseBody,
        isPartial: false,
        isRunning: false,
      })
    );
    mockDependencies = {
      search: {
        search: mockSearch,
      },
      indexPatterns: dataViewsStart,
      uiSettings: {
        get: jest.fn(),
      },
    };
    mockComputedFields(dataViewsStart, 'test-index', {});
  });

  test('should include project_routing in ES params when projectRouting is provided', (done) => {
    const searchAPI = new SearchAPI(
      mockDependencies,
      undefined,
      undefined,
      undefined,
      undefined,
      '_alias:_origin'
    );

    const searchRequest = {
      url: 'test-url',
      name: 'test-request',
      index: 'test-index',
      body: {
        query: { match_all: {} },
      },
    };

    searchAPI.search([searchRequest]).subscribe(() => {
      expect(mockSearch).toHaveBeenCalled();
      const callArgs = mockSearch.mock.calls[0][0];
      expect(callArgs.params.body.project_routing).toBe('_alias:_origin');
      done();
    });
  });

  test('should not include project_routing in ES params when projectRouting is undefined', (done) => {
    const searchAPI = new SearchAPI(
      mockDependencies,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    const searchRequest = {
      url: 'test-url',
      name: 'test-request',
      index: 'test-index',
      body: {
        query: { match_all: {} },
      },
    };

    searchAPI.search([searchRequest]).subscribe(() => {
      expect(mockSearch).toHaveBeenCalled();
      const callArgs = mockSearch.mock.calls[0][0];
      expect(callArgs.params.body.project_routing).toBeUndefined();
      done();
    });
  });

  test('should sanitize ALL projectRouting value', (done) => {
    const searchAPI = new SearchAPI(
      mockDependencies,
      undefined,
      undefined,
      undefined,
      undefined,
      'ALL'
    );

    const searchRequest = {
      url: 'test-url',
      name: 'test-request',
      index: 'test-index',
      body: {
        query: { match_all: {} },
      },
    };

    searchAPI.search([searchRequest]).subscribe(() => {
      expect(mockSearch).toHaveBeenCalled();
      const callArgs = mockSearch.mock.calls[0][0];
      // ALL gets sanitized to undefined
      expect(callArgs.params.body.project_routing).toBeUndefined();
      done();
    });
  });
});
