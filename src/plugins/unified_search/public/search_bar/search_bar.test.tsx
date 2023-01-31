/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { noop } from 'lodash';
import { fireEvent, render, waitFor, within } from '@testing-library/react';

import { waitForEuiPopoverOpen, waitForEuiPopoverClose } from '@elastic/eui/lib/test/rtl';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { DataView } from '@kbn/data-views-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';

import SearchBar from './search_bar';

const startMock = coreMock.createStart();

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

const mockFieldName = 'bytes';

const mockIndexPattern = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: mockFieldName,
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
} as DataView;

const mockFilter = [
  {
    meta: {
      index: '1234',
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'category.keyword',
      params: {
        query: "Men's Accessories",
      },
    },
    query: {
      match_phrase: {
        'category.keyword': "Men's Accessories",
      },
    },
  },
];

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const sqlQuery = {
  sql: 'SELECT * from test',
};

const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();
(dataViewEditorMock.userPermissions.editDataView as jest.Mock).mockReturnValue(true);

const services = {
  data: {
    dataViewEditor: dataViewEditorMock,
    dataViews: {
      getIdsWithTitle: jest.fn(() => []),
    },
    query: {
      savedQueries: {
        findSavedQueries: () =>
          Promise.resolve({
            queries: [
              {
                id: 'testwewe',
                attributes: {
                  title: 'Saved query 1',
                  description: '',
                  query: {
                    query: 'category.keyword : "Men\'s Shoes" ',
                    language: 'kuery',
                  },
                  filters: [],
                },
              },
            ],
          }),
      },
    },
  },
  http: startMock.http,
  notifications: startMock.notifications,
  savedObjects: startMock.savedObjects,
  storage: createMockStorage(),
  uiSettings: {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT:
          return true;
        case UI_SETTINGS.SEARCH_QUERY_LANGUAGE:
          return 'kuery';
        case UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS:
          return { from: 'now-15m', to: 'now' };
        case UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS:
          return { pause: false, value: 0 };
        case UI_SETTINGS.TIMEPICKER_QUICK_RANGES:
          return [{ from: 'here', to: 'yonder', display: 'great beyond' }];
        case UI_SETTINGS.DATE_FORMAT:
          return 'yyyy-mm-dd';
        case UI_SETTINGS.HISTORY_LIMIT:
          return 10;
        case UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES:
          return false;
        case 'theme:darkMode':
          return 'light';

        default:
          throw new Error(`query_service test: not mocked uiSetting: ${key}`);
      }
    }),
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => jest.fn(),
      getQuerySuggestions: () => [],
    },
  },
  usageCollection: {
    reportUiCounter: jest.fn(),
  },
};

const TestBed = ({ children }: { children: ReactNode }) => {
  return (
    <EuiThemeProvider>
      <I18nProvider>
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      </I18nProvider>
    </EuiThemeProvider>
  );
};

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all components in disabled state when isDisabled prop is passed', async () => {
    const wrapper = render(
      <SearchBar
        dataViewPickerComponentProps={{
          currentDataViewId: '1234',
          trigger: {
            'data-test-subj': 'dataView-switch-link',
            label: 'logstash-*',
            title: 'logstash-*',
          },
          onChangeDataView: () => {},
        }}
        filters={mockFilter}
        indexPatterns={[mockIndexPattern]}
        isDisabled
        query={kqlQuery}
        screenTitle="test screen"
        showFilterBar
        showDatePicker
        showSaveQuery
        showQueryInput
        onFiltersUpdated={noop}
        onQuerySubmit={noop}
      />,
      { wrapper: TestBed }
    );

    await waitFor(() => {
      expect(wrapper.getByTestId('queryInput')).toBeDisabled();
      expect(wrapper.queryByTitle('Clear input')).toBeNull();

      expect(wrapper.getByTestId('superDatePickerShowDatesButton')).toBeDisabled();
      expect(wrapper.getByTestId('querySubmitButton')).toBeDisabled();

      expect(wrapper.getByTestId('showQueryBarMenu')).toBeDisabled();
      expect(wrapper.getByTestId('addFilter')).toBeDisabled();
      expect(wrapper.getByTestId('dataView-switch-link')).toBeDisabled();
    });
  });

  describe('the Query Menu', () => {
    it('should render the Query Menu button when indexPatterns and query are passed', () => {
      // Because showQueryMenu is a defaultProp...
      const wrapper = render(<SearchBar indexPatterns={[mockIndexPattern]} query={kqlQuery} />, {
        wrapper: TestBed,
      });

      expect(wrapper.queryByTestId('showQueryBarMenu')).toBeTruthy();
    });

    it('should render the Query Menu button when indexPatterns, query and showQueryMenu are passed', () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} query={kqlQuery} showQueryMenu />,
        { wrapper: TestBed }
      );

      expect(wrapper.queryByTestId('showQueryBarMenu')).toBeTruthy();
    });

    it('should not render the Query Menu button when showQueryMenu is set to false', () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} query={kqlQuery} showQueryMenu={false} />,
        { wrapper: TestBed }
      );

      expect(wrapper.queryByTestId('showQueryBarMenu')).toBeNull();
    });
  });

  describe('the Query Bar', () => {
    it('should render Query Bar when indexPatterns, query and showQueryInput are passed', async () => {
      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: '',
          }}
          showQueryInput
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toBeTruthy();
      });
    });

    it('should render Query Bar when indexPatterns and query are passed', async () => {
      // Because showQueryInput is a defaultProp...
      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: '',
          }}
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toBeTruthy();
      });
    });

    it('should not render Query Bar when no query is passed', async () => {
      const wrapper = render(<SearchBar indexPatterns={[mockIndexPattern]} showQueryInput />, {
        wrapper: TestBed,
      });

      await waitFor(() => {
        expect(wrapper.queryByTestId('queryInput')).toBeNull();
      });
    });

    it('should not render Query Bar when query is passed but showQueryInput is set to false', async () => {
      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: '',
          }}
          showQueryInput={false}
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.queryByTestId('queryInput')).toBeNull();
      });
    });

    it('should render the unifiedTextLangEditor when passing an SQL query', async () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} screenTitle="test screen" query={sqlQuery} />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('unifiedTextLangEditor')).toBeTruthy();
      });
    });

    it('should prefill the query bar with the passed query and update it when it changes, as long as the language stays the same', async () => {
      const TEST_QUERY = 'a great test query';

      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: TEST_QUERY,
          }}
          showQueryInput
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toHaveValue(TEST_QUERY);
      });

      const NEW_TEST_QUERY = 'and now for something completely different';

      wrapper.rerender(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: NEW_TEST_QUERY,
          }}
          showQueryInput
        />
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toHaveValue(NEW_TEST_QUERY);
      });
    });

    it('should clear the query when the language changes', async () => {
      const TEST_QUERY = 'a great test query';

      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'kuery',
            query: TEST_QUERY,
          }}
          showQueryInput
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toHaveValue(TEST_QUERY);
      });

      wrapper.rerender(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          query={{
            language: 'lucene',
            query: TEST_QUERY,
          }}
        />
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('queryInput')).toHaveValue('');
      });
    });

    describe('when typing in the query bar', () => {
      it('should show an Update Query button when the user changes the query, and it should revert to Refresh Query when original values are passed', async () => {
        const TEST_QUERY = 'a great test query';

        const wrapper = render(
          <SearchBar
            indexPatterns={[mockIndexPattern]}
            query={{
              language: 'kuery',
              query: TEST_QUERY,
            }}
            showQueryInput
          />,
          { wrapper: TestBed }
        );

        const queryInput = wrapper.getByTestId('queryInput');

        // Change query
        fireEvent.change(queryInput, {
          target: { value: '23' },
        });

        await waitFor(() => {
          expect(wrapper.getByLabelText('Needs updating')).toBeTruthy();
        });

        // Change it back
        fireEvent.change(queryInput, {
          target: { value: TEST_QUERY },
        });

        await waitFor(() => {
          expect(wrapper.getByLabelText('Refresh query')).toBeTruthy();
        });
      });
    });
  });

  describe('the Date Picker', () => {
    it('should render a Date Picker when indexPatterns and showQueryInput are passed', async () => {
      const wrapper = render(<SearchBar indexPatterns={[mockIndexPattern]} showQueryInput />, {
        wrapper: TestBed,
      });

      await waitFor(() => {
        expect(wrapper.getByTestId('superDatePickerToggleQuickMenuButton')).toBeTruthy();
        expect(wrapper.getByTestId('superDatePickerShowDatesButton')).toBeTruthy();
      });
    });

    it('should render a Date Picker when indexPatterns, showQueryInput and showDatePicker are passed', async () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} showQueryInput showDatePicker />,
        {
          wrapper: TestBed,
        }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('superDatePickerToggleQuickMenuButton')).toBeTruthy();
        expect(wrapper.getByTestId('superDatePickerShowDatesButton')).toBeTruthy();
      });
    });

    it('should not render a Date Picker when showDatePicker is set to false', async () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} showQueryInput showDatePicker={false} />,
        {
          wrapper: TestBed,
        }
      );

      await waitFor(() => {
        expect(wrapper.queryByTestId('superDatePickerToggleQuickMenuButton')).toBeNull();
        expect(wrapper.queryByTestId('superDatePickerShowDatesButton')).toBeNull();
      });
    });

    it('should update the time in Date Picker depending on the dateRangeFrom and dateRangeTo props', async () => {
      const wrapper = render(
        <SearchBar
          indexPatterns={[mockIndexPattern]}
          dateRangeFrom="now-15m"
          dateRangeTo="now"
          showQueryInput
          showDatePicker
        />,
        {
          wrapper: TestBed,
        }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('superDatePickerShowDatesButton')).toHaveTextContent(
          'Last 15 minutes'
        );
      });

      wrapper.getByTestId('superDatePickerShowDatesButton').click();

      await waitForEuiPopoverOpen();

      const input = wrapper.getByTestId(
        'superDatePickerRelativeDateInputNumber'
      ) as HTMLInputElement;

      fireEvent.change(input, {
        target: { value: '23' },
      });

      await waitFor(() => {
        expect(wrapper.getByTestId('superDatePickerstartDatePopoverButton')).toHaveTextContent(
          '~ 23 minutes ago'
        );
      });
    });

    describe('when changing dates', () => {
      it('should show an Update Query button when changing either the "from" or "to" date, it should revert to Refresh Query when original values are passed', async () => {
        const wrapper = render(
          <SearchBar
            indexPatterns={[mockIndexPattern]}
            dateRangeFrom="now-15m"
            dateRangeTo="now"
            showQueryInput
            showDatePicker
          />,
          {
            wrapper: TestBed,
          }
        );

        wrapper.getByTestId('superDatePickerShowDatesButton').click();

        await waitForEuiPopoverOpen();

        const input = wrapper.getByTestId(
          'superDatePickerRelativeDateInputNumber'
        ) as HTMLInputElement;

        const originalValue = input.value;

        fireEvent.change(input, {
          target: { value: '23' },
        });

        await waitFor(() => {
          expect(wrapper.getByLabelText('Needs updating')).toBeTruthy();
        });

        fireEvent.change(input, {
          target: { value: originalValue },
        });

        await waitFor(() => {
          expect(wrapper.getByLabelText('Refresh query')).toBeTruthy();
        });
      });
    });
  });

  describe('the Filter Bar', () => {
    it('should render Filter Bar when filters, indexPatterns and showQueryInput are passed', async () => {
      const wrapper = render(
        <SearchBar filters={mockFilter} indexPatterns={[mockIndexPattern]} showQueryInput />,
        {
          wrapper: TestBed,
        }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('unifiedFilterBar')).toBeTruthy();
        expect(wrapper.getByTestId('unifiedFilterItems')).toBeTruthy();
      });
    });

    it('should render Filter Bar when filters, indexPatterns, showQueryInput are showFilterBar passed', async () => {
      const wrapper = render(
        <SearchBar
          filters={mockFilter}
          indexPatterns={[mockIndexPattern]}
          showFilterBar
          showQueryInput
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.getByTestId('unifiedFilterBar')).toBeTruthy();
        expect(wrapper.getByTestId('unifiedFilterItems')).toBeTruthy();
        // expect passed filter items to be there
      });
    });

    it('should not render Filter Bar if showFilterBar is set to false', async () => {
      const wrapper = render(
        <SearchBar
          filters={mockFilter}
          indexPatterns={[mockIndexPattern]}
          showFilterBar={false}
          showQueryInput
        />,
        { wrapper: TestBed }
      );

      await waitFor(() => {
        expect(wrapper.queryByTestId('unifiedFilterBar')).toBeNull();
        expect(wrapper.queryByTestId('unifiedFilterItems')).toBeNull();
      });
    });

    describe('when adding filters', () => {
      it('should not clear the Query Bar when setting a filter', async () => {
        const TEST_QUERY = 'blarf';

        const wrapper = render(
          <SearchBar
            filters={mockFilter}
            indexPatterns={[mockIndexPattern]}
            query={{ query: TEST_QUERY, language: 'lucene' }}
            showFilterBar
            showQueryInput
          />,
          { wrapper: TestBed }
        );

        // Open the filter builder
        wrapper.getByTestId('addFilter').click();

        await waitForEuiPopoverOpen();

        // Open the Field select
        within(wrapper.getByTestId('filterFieldSuggestionList'))
          .getByTestId('comboBoxSearchInput')
          .click();

        // Select a field
        wrapper.getByTitle(mockFieldName).click();

        // Open the Operator select
        within(wrapper.getByTestId('filterOperatorList'))
          .getByTestId('comboBoxSearchInput')
          .click();

        // Select an operator
        wrapper.getByTitle('is not').click();

        // Enter a value
        fireEvent.change(
          within(wrapper.getByTestId('filterParams')).getByPlaceholderText('Enter a value'),
          {
            target: { value: 1 },
          }
        );

        // Save the filter
        wrapper.getByTestId('saveFilter').click();

        await waitForEuiPopoverClose();

        await waitFor(() => {
          expect(wrapper.getByTestId('queryInput')).toHaveValue(TEST_QUERY);
        });
      });
    });
  });

  describe('the Update Query / Refresh Query button', () => {
    it('should render it when indexPatterns is passed', () => {
      const wrapper = render(<SearchBar indexPatterns={[mockIndexPattern]} />, {
        wrapper: TestBed,
      });

      expect(wrapper.getByLabelText('Refresh query')).toBeTruthy();
    });

    it('should render it when indexPatterns and showSubmitButton are passed', () => {
      const wrapper = render(<SearchBar indexPatterns={[mockIndexPattern]} />, {
        wrapper: TestBed,
      });

      expect(wrapper.getByLabelText('Refresh query')).toBeTruthy();
    });

    it('should not render it when showSubmitButton is set to false', () => {
      const wrapper = render(
        <SearchBar indexPatterns={[mockIndexPattern]} showSubmitButton={false} />,
        {
          wrapper: TestBed,
        }
      );

      expect(wrapper.queryByLabelText('Refresh query')).toBeNull();
    });
  });
});
