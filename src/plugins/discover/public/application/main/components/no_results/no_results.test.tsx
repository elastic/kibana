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
import { type Filter } from '@kbn/es-query';
import { DiscoverNoResults, DiscoverNoResultsProps } from './no_results';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

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
    viewMatchesButton: findTestSubject(component!, 'discoverNoResultsViewAllMatches').exists(),
  };
}

describe('DiscoverNoResults', () => {
  beforeEach(() => {
    (RxApi.lastValueFrom as jest.Mock).mockClear();
  });

  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataViewWithoutTimeField,
          query: undefined,
          filters: undefined,
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
            "viewMatchesButton": false,
          }
        `);
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
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
            "viewMatchesButton": true,
          }
        `);
        expect(RxApi.lastValueFrom).toHaveBeenCalledTimes(1);
      });
    });

    describe('filter/query', () => {
      test('shows "adjust search" message when having query', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '*' },
          filters: undefined,
        });
        expect(result).toHaveProperty('adjustSearch', true);
      });

      test('shows "adjust filters" message when having filters', async () => {
        const result = await mountAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [{} as Filter],
        });
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
          query: { language: 'lucene', query: '' },
          filters: [{} as Filter],
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
            "viewMatchesButton": false,
          }
        `);
      });
    });
  });
});
