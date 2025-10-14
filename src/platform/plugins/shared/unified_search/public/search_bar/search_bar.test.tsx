/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SearchBarProps, SearchBarState } from './search_bar';
import SearchBar, { SearchBarUI } from './search_bar';
import { BehaviorSubject } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { searchServiceMock } from '@kbn/data-plugin/public/search/mocks';
import { createMockStorage, createMockTimeHistory } from './mocks';
import { SearchSessionState } from '@kbn/data-plugin/public';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';

const startMock = coreMock.createStart();

const noop = jest.fn();

const kqlQuery = {
  query: 'response:200',
  language: 'kuery',
};

const esqlQuery = {
  esql: 'from test',
};

function wrapSearchBarInContext(
  testProps: any,
  options?: {
    backgroundSearch?: {
      enabled?: boolean;
      initialState?: SearchSessionState;
    };
  }
) {
  const defaultOptions = {
    appName: 'test',
    timeHistory: createMockTimeHistory(),
    intl: null as any,
  };

  const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();
  (dataViewEditorMock.userPermissions.editDataView as jest.Mock).mockReturnValue(true);

  const backgroundSearchEnabled = options?.backgroundSearch?.enabled ?? false;
  const initialSessionState = options?.backgroundSearch?.initialState ?? SearchSessionState.None;
  const sessionState$ = new BehaviorSubject<SearchSessionState>(initialSessionState);

  const services = {
    application: {
      ...startMock.application,
      capabilities: {
        ...startMock.application.capabilities,
        savedQueryManagement: {
          showQueries: true,
          saveQuery: true,
        },
      },
    },
    chrome: {
      ...startMock.chrome,
      getActiveSolutionNavId$: jest.fn().mockReturnValue(new BehaviorSubject('oblt')),
    },
    uiSettings: startMock.uiSettings,
    settings: startMock.settings,
    notifications: startMock.notifications,
    http: startMock.http,
    theme: startMock.theme,
    docLinks: startMock.docLinks,
    storage: createMockStorage(),
    data: {
      search: searchServiceMock.createStartContract({
        isBackgroundSearchEnabled: backgroundSearchEnabled,
        session: getSessionServiceMock({ state$: sessionState$ }),
      }),
      query: {
        savedQueries: {
          findSavedQueries: () =>
            Promise.resolve({
              total: 1,
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
          getSavedQueryCount: jest.fn(),
        },
      },
      dataViewEditor: dataViewEditorMock,
      dataViews: {
        getIdsWithTitle: jest.fn(() => []),
      },
    },
  };

  return (
    <EuiThemeProvider>
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SearchBar.WrappedComponent {...defaultOptions} {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiThemeProvider>
  );
}

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render query bar when no options provided (in reality - timepicker)', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedFilterBar')).not.toBeInTheDocument();
      expect(screen.getByTestId('kbnQueryBar')).toBeInTheDocument();
    });
  });

  it('Should render filter bar, when required fields are provided', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        showDatePicker: false,
        showQueryInput: true,
        showFilterBar: true,
        onFiltersUpdated: noop,
        filters: [],
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      // Check for filter-related elements that are actually rendered
      expect(screen.getByTestId('addFilter')).toBeInTheDocument();
      expect(screen.getByTestId('kbnQueryBar')).toBeInTheDocument();
    });
  });

  it('Should NOT render filter bar, if disabled', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        showFilterBar: false,
        filters: [],
        onFiltersUpdated: noop,
        showDatePicker: false,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedFilterBar')).not.toBeInTheDocument();
      expect(screen.getByTestId('kbnQueryBar')).toBeInTheDocument();
    });
  });

  it('Should render query bar, when required fields are provided', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedFilterBar')).not.toBeInTheDocument();
      expect(screen.getByTestId('kbnQueryBar')).toBeInTheDocument();
    });
  });

  it('Should NOT render the input query input, if disabled', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
        showQueryInput: false,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedFilterBar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedQueryInput')).not.toBeInTheDocument();
    });
  });

  it('Should NOT render the query menu button, if disabled', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: kqlQuery,
        showQueryMenu: false,
      })
    );

    expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
    expect(screen.queryByTestId('showQueryBarMenu')).not.toBeInTheDocument();
  });

  it('Should render query bar and filter bar', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        showQueryInput: true,
        onQuerySubmit: noop,
        query: kqlQuery,
        filters: [],
        onFiltersUpdated: noop,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      // Check for filter-related elements that are actually rendered
      expect(screen.getByTestId('addFilter')).toBeInTheDocument();
      expect(screen.getByTestId('kbnQueryBar')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedQueryInput')).toBeInTheDocument();
    });
  });

  it('Should NOT render the input query input, for es|ql query', async () => {
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        query: esqlQuery,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
      // Check for ES|QL menu button instead of editor since that's what's rendered
      expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedQueryInput')).not.toBeInTheDocument();
    });
  });

  it('Should render in isDisabled state', async () => {
    const { container } = render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: noop,
        isDisabled: true,
        query: kqlQuery,
        filters: [],
        onFiltersUpdated: noop,
        dataViewPickerComponentProps: {
          trigger: {
            label: 'Data View',
          },
        },
      })
    );

    await waitFor(() => {
      const queryInput = screen.getByTestId('unifiedQueryInput');
      expect(queryInput.querySelector('textarea')).toBeDisabled();
      expect(queryInput.querySelector('[title="Clear input"]')).toBeFalsy();

      expect(screen.getByTestId('showQueryBarMenu')).toBeDisabled();
      expect(screen.getByTestId('addFilter')).toBeDisabled();

      // Check all buttons are disabled
      Array.from(container.querySelectorAll('button')).forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  it('Should call onQuerySubmit with isUpdate prop as false when dateRange is provided', async () => {
    const user = userEvent.setup();
    const mockedOnQuerySubmit = jest.fn();
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: mockedOnQuerySubmit,
        query: kqlQuery,
        showQueryMenu: false,
        dateRangeTo: 'now',
        dateRangeFrom: 'now-15m',
      })
    );

    const submitButton = screen.getByTestId('querySubmitButton');
    await user.click(submitButton);

    expect(mockedOnQuerySubmit).toBeCalledTimes(1);
    expect(mockedOnQuerySubmit).toHaveBeenNthCalledWith(
      1,
      {
        dateRange: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', query: 'response:200' },
      },
      false
    );
  });

  it('Should call onQuerySubmit with isUpdate prop as true when dateRange is not provided', async () => {
    const user = userEvent.setup();
    const mockedOnQuerySubmit = jest.fn();
    render(
      wrapSearchBarInContext({
        indexPatterns: [stubIndexPattern],
        screenTitle: 'test screen',
        onQuerySubmit: mockedOnQuerySubmit,
        query: kqlQuery,
        showQueryMenu: false,
      })
    );

    const submitButton = screen.getByTestId('querySubmitButton');
    await user.click(submitButton);

    expect(mockedOnQuerySubmit).toBeCalledTimes(1);
    expect(mockedOnQuerySubmit).toHaveBeenNthCalledWith(
      1,
      {
        dateRange: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', query: 'response:200' },
      },
      // isUpdate is true because the default value in state ({ from: 'now-15m', to: 'now' })
      // is not equal with props for dateRange which is undefined
      true
    );
  });

  describe('SearchBarUI.getDerivedStateFromProps', () => {
    it('should not return the esql query if props.query doesnt change but loading state changes', () => {
      const nextProps = {
        query: { esql: 'test' },
        isLoading: false,
      } as unknown as SearchBarProps;
      const prevState = {
        currentProps: {
          query: { esql: 'test' },
        },
        query: { esql: 'test_edited' },
        isLoading: true,
      } as unknown as SearchBarState;

      const result = SearchBarUI.getDerivedStateFromProps(nextProps, prevState);
      // if the query was returned, it would overwrite the state in the underlying ES|QL editor
      expect(result).toEqual({
        currentProps: { isLoading: false, query: { esql: 'test' } },
      });
    });
    it('should return the query if props.query and loading state changes', () => {
      const nextProps = {
        query: { esql: 'test_new_props' },
        isLoading: false,
      } as unknown as SearchBarProps;
      const prevState = {
        currentProps: {
          query: { esql: 'test' },
        },
        query: { esql: 'test_edited' },
        isLoading: true,
      } as unknown as SearchBarState;

      const result = SearchBarUI.getDerivedStateFromProps(nextProps, prevState);
      // here it makes sense to return the query, because the props.query has changed
      expect(result).toEqual({
        currentProps: { isLoading: false, query: { esql: 'test_new_props' } },
        query: {
          esql: 'test_new_props',
        },
      });
    });
  });

  describe('draft', () => {
    it('should prefill with the draft query if provided', async () => {
      const draft = {
        query: { language: 'kuery', query: 'test_draft' },
        dateRangeFrom: 'now-30m',
        dateRangeTo: 'now-10m',
      };
      const onDraftChange = jest.fn();
      render(
        wrapSearchBarInContext({
          indexPatterns: [stubIndexPattern],
          query: kqlQuery,
          dateRangeTo: 'now',
          dateRangeFrom: 'now-15m',
          draft,
          onDraftChange,
        })
      );

      expect(onDraftChange).toHaveBeenCalledWith(draft);

      await waitFor(() => {
        const textarea = document.querySelector('textarea');
        expect(textarea).toHaveValue(draft.query.query);
      });
    });

    it('should check for query type mismatch', async () => {
      const draft = {
        query: esqlQuery,
        dateRangeFrom: 'now-30m',
        dateRangeTo: 'now-10m',
      };
      const onDraftChange = jest.fn();
      render(
        wrapSearchBarInContext({
          indexPatterns: [stubIndexPattern],
          query: kqlQuery,
          dateRangeTo: 'now',
          dateRangeFrom: 'now-15m',
          draft,
          onDraftChange,
        })
      );

      expect(onDraftChange).toHaveBeenCalledWith(undefined);

      await waitFor(() => {
        const textarea = document.querySelector('textarea');
        expect(textarea).toHaveValue(kqlQuery.query);
      });
    });
  });

  it('renders BackgroundSearchRestoredCallout when feature flag enabled and session restored', () => {
    render(
      wrapSearchBarInContext(
        { indexPatterns: [stubIndexPattern] },
        {
          backgroundSearch: {
            enabled: true,
            initialState: SearchSessionState.Restored,
          },
        }
      )
    );

    expect(screen.getByTestId('backgroundSearchRestoredCallout')).toBeInTheDocument();
  });

  it('does not render BackgroundSearchRestoredCallout when feature flag disabled', () => {
    render(
      wrapSearchBarInContext(
        { indexPatterns: [stubIndexPattern] },
        {
          backgroundSearch: {
            enabled: false,
            initialState: SearchSessionState.Restored,
          },
        }
      )
    );

    expect(screen.getByTestId('globalQueryBar')).toBeInTheDocument();
    // Then verify the callout is not rendered
    expect(screen.queryByTestId('backgroundSearchRestoredCallout')).not.toBeInTheDocument();
  });
});
