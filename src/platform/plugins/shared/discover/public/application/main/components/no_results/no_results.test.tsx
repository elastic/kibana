/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import {
  stubDataView,
  stubDataViewWithoutTimeField,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { type Filter } from '@kbn/es-query';
import type { DiscoverNoResultsProps } from './no_results';
import { DiscoverNoResults } from './no_results';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { of } from 'rxjs';

const services = createDiscoverServicesMock();
const searchMock = jest.spyOn(services.data.search, 'search');

function findSubjects() {
  return {
    mainMsg: screen.queryByTestId('discoverNoResults') !== null,
    errorMsg: screen.queryByTestId('discoverNoResultsError') !== null,
    adjustTimeRange: screen.queryByTestId('discoverNoResultsTimefilter') !== null,
    adjustSearch: screen.queryByTestId('discoverNoResultsAdjustSearch') !== null,
    adjustFilters: screen.queryByTestId('discoverNoResultsAdjustFilters') !== null,
    checkIndices: screen.queryByTestId('discoverNoResultsCheckIndices') !== null,
    disableFiltersButton: screen.queryByTestId('discoverNoResultsDisableFilters') !== null,
    viewMatchesButton: screen.queryByTestId('discoverNoResultsViewAllMatches') !== null,
    searchAllMatchesGivesNoResults:
      screen.queryByTestId('discoverSearchAllMatchesGivesNoResults') !== null,
  };
}

async function renderAndFindSubjects(
  props: Omit<DiscoverNoResultsProps, 'onDisableFilters' | 'data' | 'isTimeBased'>
) {
  const user = userEvent.setup();
  const isTimeBased = props.dataView.isTimeBased();
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();

  await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  renderWithKibanaRenderContext(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverNoResults isTimeBased={isTimeBased} onDisableFilters={() => {}} {...props} />
    </DiscoverToolkitTestProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('discoverNoResults')).toBeVisible();
  });

  return {
    user,
    subjects: findSubjects(),
  };
}

describe('DiscoverNoResults', () => {
  beforeEach(() => {
    searchMock.mockClear();
    searchMock.mockReturnValue(
      of({
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
      })
    );
  });

  describe('props', () => {
    describe('no props', () => {
      test('renders default feedback', async () => {
        const result = await renderAndFindSubjects({
          dataView: stubDataViewWithoutTimeField,
          query: undefined,
          filters: undefined,
        });
        expect(result.subjects).toEqual({
          adjustFilters: false,
          adjustSearch: false,
          adjustTimeRange: false,
          checkIndices: true,
          disableFiltersButton: false,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: false,
        });
      });
    });
    describe('timeFieldName', () => {
      test('renders time range feedback', async () => {
        const result = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
        });
        expect(result.subjects).toEqual({
          adjustFilters: false,
          adjustSearch: false,
          adjustTimeRange: true,
          checkIndices: false,
          disableFiltersButton: false,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: true,
        });
        expect(searchMock).toHaveBeenCalledTimes(0);
      });

      test('should handle no results after the button is pressed', async () => {
        searchMock.mockReturnValue(
          of({
            rawResponse: {},
          })
        );
        const { subjects, user } = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
        });
        expect(subjects).toEqual({
          adjustFilters: false,
          adjustSearch: false,
          adjustTimeRange: true,
          checkIndices: false,
          disableFiltersButton: false,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: true,
        });
        expect(searchMock).toHaveBeenCalledTimes(0);

        await user.click(screen.getByTestId('discoverNoResultsViewAllMatches'));

        await waitFor(() => {
          expect(searchMock).toHaveBeenCalledTimes(1);
          expect(findSubjects()).toEqual({
            adjustFilters: false,
            adjustSearch: false,
            adjustTimeRange: true,
            checkIndices: false,
            disableFiltersButton: false,
            errorMsg: false,
            mainMsg: true,
            searchAllMatchesGivesNoResults: true,
            viewMatchesButton: false,
          });
        });
      });

      test('should handle timeout after the button is pressed', async () => {
        searchMock.mockReturnValue(
          of({
            rawResponse: {
              timed_out: true,
            },
          })
        );
        const { subjects, user } = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
        });
        expect(subjects).toEqual({
          adjustFilters: false,
          adjustSearch: false,
          adjustTimeRange: true,
          checkIndices: false,
          disableFiltersButton: false,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: true,
        });
        expect(searchMock).toHaveBeenCalledTimes(0);

        await user.click(screen.getByTestId('discoverNoResultsViewAllMatches'));

        await waitFor(() => {
          expect(searchMock).toHaveBeenCalledTimes(1);
          expect(findSubjects()).toEqual({
            adjustFilters: false,
            adjustSearch: false,
            adjustTimeRange: true,
            checkIndices: false,
            disableFiltersButton: false,
            errorMsg: false,
            mainMsg: true,
            searchAllMatchesGivesNoResults: false,
            viewMatchesButton: true,
          });
        });
      });

      test('should handle failures after the button is pressed', async () => {
        searchMock.mockReturnValue(
          of({
            rawResponse: {
              _clusters: {
                total: 2,
                successful: 1,
              },
              aggregations: {
                earliest_timestamp: {
                  value_as_string: '2020-09-01T08:30:00.000Z',
                },
                latest_timestamp: {
                  value_as_string: '2022-09-01T08:30:00.000Z',
                },
              },
            },
          })
        );
        const { subjects, user } = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
        });
        expect(subjects).toEqual({
          adjustFilters: false,
          adjustSearch: false,
          adjustTimeRange: true,
          checkIndices: false,
          disableFiltersButton: false,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: true,
        });
        expect(searchMock).toHaveBeenCalledTimes(0);

        await user.click(screen.getByTestId('discoverNoResultsViewAllMatches'));

        await waitFor(() => {
          expect(searchMock).toHaveBeenCalledTimes(1);
          expect(findSubjects()).toEqual({
            adjustFilters: false,
            adjustSearch: false,
            adjustTimeRange: true,
            checkIndices: false,
            disableFiltersButton: false,
            errorMsg: false,
            mainMsg: true,
            searchAllMatchesGivesNoResults: false,
            viewMatchesButton: true,
          });
        });
      });

      test('passes strict_date_optional_time format to range query', async () => {
        const { user } = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [],
        });

        await user.click(screen.getByTestId('discoverNoResultsViewAllMatches'));

        await waitFor(() => {
          expect(services.data.search.search).toHaveBeenCalled();
        });

        expect(services.data.search.search).toHaveBeenLastCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              aggs: expect.objectContaining({
                earliest_timestamp: expect.objectContaining({
                  min: expect.objectContaining({
                    format: 'strict_date_optional_time',
                  }),
                }),
                latest_timestamp: expect.objectContaining({
                  max: expect.objectContaining({
                    format: 'strict_date_optional_time',
                  }),
                }),
              }),
            }),
          }),
          expect.any(Object)
        );
      });
    });

    describe('filter/query', () => {
      test('shows "adjust search" message when having query', async () => {
        const result = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '*' },
          filters: undefined,
        });
        expect(result.subjects).toHaveProperty('adjustSearch', true);
        expect(result.subjects).toHaveProperty('disableFiltersButton', false);
      });

      test('shows "adjust filters" message when having filters', async () => {
        const result = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: '' },
          filters: [{} as Filter],
        });
        expect(result.subjects).toHaveProperty('adjustFilters', true);
        expect(result.subjects).toHaveProperty('disableFiltersButton', true);
      });

      test('should handle no results when having filters and after the button is pressed', async () => {
        searchMock.mockReturnValue(
          of({
            rawResponse: {},
          })
        );
        const { subjects, user } = await renderAndFindSubjects({
          dataView: stubDataView,
          query: { language: 'lucene', query: 'css*' },
          filters: [{} as Filter],
        });
        expect(subjects).toEqual({
          adjustFilters: true,
          adjustSearch: true,
          adjustTimeRange: true,
          checkIndices: false,
          disableFiltersButton: true,
          errorMsg: false,
          mainMsg: true,
          searchAllMatchesGivesNoResults: false,
          viewMatchesButton: true,
        });
        expect(searchMock).toHaveBeenCalledTimes(0);

        await user.click(screen.getByTestId('discoverNoResultsViewAllMatches'));

        await waitFor(() => {
          expect(searchMock).toHaveBeenCalledTimes(1);
          expect(findSubjects()).toEqual({
            adjustFilters: true,
            adjustSearch: true,
            adjustTimeRange: true,
            checkIndices: false,
            disableFiltersButton: true,
            errorMsg: false,
            mainMsg: true,
            searchAllMatchesGivesNoResults: true,
            viewMatchesButton: false,
          });
        });
      });
    });
  });
});
