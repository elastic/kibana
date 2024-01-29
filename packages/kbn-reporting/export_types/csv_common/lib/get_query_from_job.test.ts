/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EsQuerySortValue, SearchSourceFields } from '@kbn/data-plugin/common';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { getQueryFromCsvJob } from './get_query_from_job';

describe('getQueryFromCsvJob', () => {
  it('returns QueryInspection data', async () => {
    const searchSourceStart = { ...searchSourceCommonMock };
    const originalCreate = searchSourceStart.create;
    searchSourceStart.create = jest.fn().mockImplementation(async () => {
      const original = await originalCreate();
      const originalGetField = original.getField;
      const getField = (fieldName: keyof SearchSourceFields) => {
        if (fieldName === 'index') {
          return createStubDataView({
            spec: {
              id: 'test-*',
              title: 'test-*',
            },
          });
        }
        return originalGetField(fieldName);
      };
      return {
        ...original,
        getField,
      };
    });

    const config = { scroll: { duration: '2m', size: 500 } };

    const fromTime = '2019-06-20T00:00:00.000Z';
    const toTime = '2019-06-24T00:00:00.000Z';
    const serializedSearchSource = {
      version: true,
      query: { query: '', language: 'kuery' },
      index: '5193f870-d861-11e9-a311-0fa548c5f953',
      sort: [{ order_date: 'desc' }] as EsQuerySortValue[],
      fields: ['*'],
      filter: [],
      parent: {
        query: { language: 'kuery', query: '' },
        filter: [],
        parent: {
          filter: [
            {
              meta: { index: '5193f870-d861-11e9-a311-0fa548c5f953', params: {} },
              range: {
                order_date: {
                  gte: fromTime,
                  lte: toTime,
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
    };

    const searchSource = await searchSourceStart.create(serializedSearchSource);
    const query = getQueryFromCsvJob(searchSource, config);

    // NOTE the mocked search source service is not returning assertable info
    expect(query).toMatchInlineSnapshot(`
      Object {
        "requestBody": undefined,
      }
    `);
  });
});
