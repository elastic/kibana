/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import * as QueryApi from '@kbn/unified-field-list-plugin/public/hooks/use_query_subscriber';
import * as SearchApi from '@kbn/unified-search-plugin/public/query_string_input/custom_date_picker_panel/get_documents_time_range';
import { DiscoverNoResults, DiscoverNoResultsProps } from './no_results';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

const dataView = stubDataView;

jest.spyOn(QueryApi, 'useQuerySubscriber');
jest.spyOn(SearchApi, 'getDocumentsTimeRange');

async function mountAndFindSubjects(
  props: Omit<DiscoverNoResultsProps, 'onDisableFilters' | 'data' | 'dataView'>
) {
  const services = createDiscoverServicesMock();
  let component: ReactWrapper;

  await act(async () => {
    component = await mountWithIntl(
      <KibanaContextProvider services={services}>
        <DiscoverNoResults
          data={services.data}
          dataView={dataView}
          onDisableFilters={() => {}}
          {...props}
        />
      </KibanaContextProvider>
    );
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  await component!.update();

  return {
    mainMsg: findTestSubject(component!, 'discoverNoResults').exists(),
    errorMsg: findTestSubject(component!, 'discoverNoResultsError').exists(),
    adjustTimeRange: findTestSubject(component!, 'discoverNoResultsTimefilter').exists(),
    adjustSearch: findTestSubject(component!, 'discoverNoResultsAdjustSearch').exists(),
    adjustFilters: findTestSubject(component!, 'discoverNoResultsAdjustFilters').exists(),
    checkIndices: findTestSubject(component!, 'discoverNoResultsCheckIndices').exists(),
    disableFiltersButton: findTestSubject(component!, 'discoverNoResultsDisableFilters').exists(),
  };
}

describe('DiscoverNoResults', () => {
  beforeEach(() => {
    (QueryApi.useQuerySubscriber as jest.Mock).mockClear();
    (SearchApi.getDocumentsTimeRange as jest.Mock).mockClear();
  });

  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', async () => {
        const result = await mountAndFindSubjects({});
        expect(result).toMatchInlineSnapshot(`
          Object {
            "adjustFilters": false,
            "adjustSearch": false,
            "adjustTimeRange": false,
            "checkIndices": true,
            "disableFiltersButton": false,
            "errorMsg": false,
            "mainMsg": true,
          }
        `);
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', async () => {
        (SearchApi.getDocumentsTimeRange as jest.Mock).mockImplementation(async () => ({
          from: '2020-09-01T08:30:00.000Z',
          to: 'now',
        }));
        (QueryApi.useQuerySubscriber as jest.Mock).mockImplementation(() => ({
          query: { language: 'lucene', query: '' },
          filters: [],
        }));

        const result = await mountAndFindSubjects({
          isTimeBased: true,
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
          }
        `);
        expect(QueryApi.useQuerySubscriber).toHaveBeenCalledTimes(1);
        expect(SearchApi.getDocumentsTimeRange).toHaveBeenCalledTimes(1);
      });
    });

    describe('filter/query', () => {
      test('shows "adjust search" message when having query', async () => {
        (SearchApi.getDocumentsTimeRange as jest.Mock).mockImplementation(async () => ({
          from: '2020-09-01T08:30:00.000Z',
          to: 'now',
        }));
        (QueryApi.useQuerySubscriber as jest.Mock).mockImplementation(() => ({
          query: { language: 'lucene', query: '*' },
          filters: [],
        }));

        const result = await mountAndFindSubjects({});
        expect(result).toHaveProperty('adjustSearch', true);
      });

      test('shows "adjust filters" message when having filters', async () => {
        (SearchApi.getDocumentsTimeRange as jest.Mock).mockImplementation(async () => ({
          from: '2020-09-01T08:30:00.000Z',
          to: 'now',
        }));
        (QueryApi.useQuerySubscriber as jest.Mock).mockImplementation(() => ({
          query: { language: 'lucene', query: '' },
          filters: [{}],
        }));

        const result = await mountAndFindSubjects({});
        expect(result).toHaveProperty('adjustFilters', true);
        expect(result).toHaveProperty('disableFiltersButton', true);
      });
    });

    describe('error message', () => {
      test('renders error message', async () => {
        const error = new Error('Fatal error');
        const result = await mountAndFindSubjects({
          isTimeBased: true,
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
          }
        `);
      });
    });
  });
});
