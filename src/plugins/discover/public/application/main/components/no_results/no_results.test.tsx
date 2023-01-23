/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import * as RxApi from 'rxjs';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
} from '@kbn/data-views-plugin/common/data_view.stub';
import * as QueryApi from '@kbn/unified-field-list-plugin/public/hooks/use_query_subscriber';
import { DiscoverNoResults, DiscoverNoResultsProps } from './no_results';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

const MOCK_DEFAULT_QUERY = {
  query: { language: 'lucene', query: '' },
  filters: [],
  fromDate: 'now-15m',
  toDate: 'now',
};

jest.spyOn(QueryApi, 'useQuerySubscriber').mockImplementation(() => MOCK_DEFAULT_QUERY);
jest.spyOn(RxApi, 'lastValueFrom').mockImplementation(async () => ({
  rawResponse: {
    aggregations: {
      earliest_timestamp: {
        value_as_string: '2020-09-01T08:30:00.000Z',
      },
      latest_timestamp: {
        value_as_string: '2022-09-01T08:30:00.000Z',
      },
    },
  },
}));

async function mountAndFindSubjects(
  props: Omit<DiscoverNoResultsProps, 'onDisableFilters' | 'data' | 'isTimeBased'>
) {
  const services = createDiscoverServicesMock();

  let component: ReactWrapper;

  await act(async () => {
    component = await mountWithIntl(
      <KibanaContextProvider services={services}>
        <DiscoverNoResults
          data={services.data}
          isTimeBased={props.dataView.isTimeBased()}
          onDisableFilters={() => {}}
          {...props}
        />
      </KibanaContextProvider>
    );
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  await act(async () => {
    await component!.update();
  });

  return {
    mainMsg: findTestSubject(component!, 'discoverNoResults').exists(),
    errorMsg: findTestSubject(component!, 'discoverNoResultsError').exists(),
    adjustTimeRange: findTestSubject(component!, 'discoverNoResultsTimefilter').exists(),
    adjustSearch: findTestSubject(component!, 'discoverNoResultsAdjustSearch').exists(),
    adjustFilters: findTestSubject(component!, 'discoverNoResultsAdjustFilters').exists(),
    checkIndices: findTestSubject(component!, 'discoverNoResultsCheckIndices').exists(),
    disableFiltersButton: findTestSubject(component!, 'discoverNoResultsDisableFilters').exists(),
    recentMatchesButton: findTestSubject(component!, 'discoverNoResultsViewAllMatches').exists(),
  };
}

describe('DiscoverNoResults', () => {
  beforeEach(() => {
    (QueryApi.useQuerySubscriber as jest.Mock).mockClear();
    (RxApi.lastValueFrom as jest.Mock).mockClear();
  });

  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataViewWithoutTimeField,
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": false,
            "checkIndices": true,
            "disableFiltersButton": false,
            "errorMsg": false,
            "mainMsg": true,
            "recentMatchesButton": false,
          }
        `);
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataView,
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": true,
            "checkIndices": false,
            "disableFiltersButton": false,
            "errorMsg": false,
            "mainMsg": true,
            "recentMatchesButton": true,
          }
        `);
        expect(QueryApi.useQuerySubscriber).toHaveBeenCalled();
        expect(RxApi.lastValueFrom).toHaveBeenCalledTimes(1);
      });
    });

    describe('filter/query', () => {
      test('shows "adjust search" message when having query', async () => {
        const mockNonEmptyQuery = {
          ...MOCK_DEFAULT_QUERY,
          query: { language: 'lucene', query: '*' },
        };
        (QueryApi.useQuerySubscriber as jest.Mock).mockReset();
        (QueryApi.useQuerySubscriber as jest.Mock).mockImplementation(() => mockNonEmptyQuery);

        const result = await mountAndFindSubjects({ dataView: stubDataView });
        expect(result).toHaveProperty('adjustSearch', true);
      });

      test('shows "adjust filters" message when having filters', async () => {
        const mockQueryWithFilters = {
          ...MOCK_DEFAULT_QUERY,
          filters: [{}],
        };
        (QueryApi.useQuerySubscriber as jest.Mock).mockReset();
        (QueryApi.useQuerySubscriber as jest.Mock).mockImplementation(() => mockQueryWithFilters);

        const result = await mountAndFindSubjects({ dataView: stubDataView });
        expect(result).toHaveProperty('adjustFilters', true);
        expect(result).toHaveProperty('disableFiltersButton', true);
      });
    });

    describe('error message', () => {
      test('renders error message', async () => {
        const error = new Error('Fatal error');
        const result = await mountAndFindSubjects({
          dataView: stubDataView,
          error,
        });
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": false,
            "checkIndices": false,
            "disableFiltersButton": false,
            "errorMsg": true,
            "mainMsg": false,
            "recentMatchesButton": false,
          }
        `);
      });
    });
  });
});
