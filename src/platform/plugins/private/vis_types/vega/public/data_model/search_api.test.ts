/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { of } from 'rxjs';

import type { estypes } from '@elastic/elasticsearch';

import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { getSearchParamsFromRequest, SearchRequest } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { extendSearchParamsWithRuntimeFields, SearchAPI } from './search_api';

const mockComputedFields = (
  dataViewsStart: DataViewsPublicPluginStart,
  index: string,
  runtimeFields: Record<string, unknown>
) => {
  dataViewsStart.find = vi.fn().mockReturnValue([
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

  test('should use runtime mappings from spec if specified', async () => {
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

describe('SearchAPI', () => {
  let mockSearch: Mock;
  let dataViewsStart: DataViewsPublicPluginStart;
  let mockDependencies: any;

  beforeEach(() => {
    dataViewsStart = dataViewPluginMocks.createStartContract();
    mockSearch = vi.fn().mockReturnValue(
      of({
        rawResponse: [],
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
        get: vi.fn(),
      },
    };
    mockComputedFields(dataViewsStart, 'test-index', {});
  });

  describe('search', () => {
    test('should call search with the correct params', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(mockDependencies);
        const searchRequest: SearchRequest<estypes.SearchRequest> = {
          index: 'test-index',
          runtime_mappings: {},
        };
        searchAPI.search([searchRequest]).subscribe(() => {
          expect(mockSearch).toHaveBeenCalled();
          const searchRequestParams = mockSearch.mock.calls[0][0].params;
          expect(searchRequestParams).toMatchObject(searchRequest);
          done();
        });
      }));

    test('should include and elevate body params in the search request', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(mockDependencies);
        const searchRequest: SearchRequest<estypes.SearchRequest> = {
          index: 'test-index',
          body: {
            // @ts-expect-error - testing deprecated body params
            runtime_mappings: {},
          },
        };
        searchAPI.search([searchRequest]).subscribe(() => {
          expect(mockSearch).toHaveBeenCalled();
          const searchRequestParams = mockSearch.mock.calls[0][0].params;
          expect(searchRequestParams).toEqual({
            index: 'test-index',
            runtime_mappings: {},
          });
          done();
        });
      }));

    test('should use root params over body params in the search request', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(mockDependencies);
        const searchRequest: SearchRequest<estypes.SearchRequest> = {
          index: 'test-index',
          body: {
            // @ts-expect-error - testing deprecated body params
            runtime_mappings: {
              test: { type: 'keyword' },
            },
          },
          runtime_mappings: {},
        };
        searchAPI.search([searchRequest]).subscribe(() => {
          expect(mockSearch).toHaveBeenCalled();
          const searchRequestParams = mockSearch.mock.calls[0][0].params;
          expect(searchRequestParams).toEqual({
            index: 'test-index',
            runtime_mappings: {},
          });
          done();
        });
      }));

    describe('projectRouting', () => {
      const testProjectRouting = (
        projectRouting: string | undefined,
        expectedValue: string | undefined,
        done: jest.DoneCallback
      ) => {
        const searchAPI = new SearchAPI(
          mockDependencies,
          undefined,
          undefined,
          undefined,
          undefined,
          projectRouting
        );
        const searchRequest: SearchRequest<{}> = {
          index: 'test-index',
        };

        searchAPI.search([searchRequest]).subscribe(() => {
          expect(mockSearch).toHaveBeenCalled();
          const searchOptions = mockSearch.mock.calls[0][1];
          expect(searchOptions?.projectRouting).toBe(expectedValue);
          done();
        });
      };

      test('should include project_routing in ES params when projectRouting is provided', () =>
        new Promise<void>((resolve, reject) => {
          const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
            fail: reject,
          });

          testProjectRouting('_alias:_origin', '_alias:_origin', done);
        }));

      test('should not include project_routing in ES params when projectRouting is undefined', () =>
        new Promise<void>((resolve, reject) => {
          const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
            fail: reject,
          });

          testProjectRouting(undefined, undefined, done);
        }));
    });
  });

  describe('searchEsql', () => {
    const esqlRequest = { query: 'FROM logs-*', name: 'esql-request' };

    test('should call search with the esql_async strategy', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(mockDependencies);
        searchAPI.searchEsql([esqlRequest]).subscribe(() => {
          expect(mockSearch).toHaveBeenCalled();
          const searchOptions = mockSearch.mock.calls[0][1];
          expect(searchOptions.strategy).toBe('esql_async');
          done();
        });
      }));

    test('should include approximation in search options when isApproximate is true', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(
          mockDependencies,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        searchAPI.searchEsql([esqlRequest]).subscribe(() => {
          const searchOptions = mockSearch.mock.calls[0][1];
          expect(searchOptions.approximation).toBe(true);
          done();
        });
      }));

    test('should default approximation to false when isApproximate is not provided', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const searchAPI = new SearchAPI(mockDependencies);
        searchAPI.searchEsql([esqlRequest]).subscribe(() => {
          const searchOptions = mockSearch.mock.calls[0][1];
          expect(searchOptions.approximation).toBe(false);
          done();
        });
      }));

    test('should include projectRouting and approximation in the inspector request json', () =>
      new Promise<void>((resolve, reject) => {
        const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
          fail: reject,
        });

        const jsonMock = vi.fn();
        const inspectorAdapters = {
          requests: {
            start: vi.fn().mockReturnValue({
              json: jsonMock,
              stats: vi.fn().mockReturnThis(),
              ok: vi.fn(),
            }),
          },
        };
        const searchAPI = new SearchAPI(
          mockDependencies,
          undefined,
          inspectorAdapters as any,
          undefined,
          undefined,
          '_alias:_origin',
          true
        );
        searchAPI.searchEsql([esqlRequest]).subscribe(() => {
          expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
              query: 'FROM logs-*',
              projectRouting: '_alias:_origin',
              approximation: true,
            })
          );
          done();
        });
      }));
  });
});
