/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ContextApp, type ContextAppProps } from './context_app';
import { uiSettingsMock } from '../../__mocks__/ui_settings';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import { LoadingStatus } from './services/context_query_state';
import { useContextAppFetch } from './hooks/use_context_app_fetch';
import { useContextAppState } from './hooks/use_context_app_state';
import type { AppState, GetStateReturn, GlobalState } from './services/context_state';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';

jest.mock('./hooks/use_context_app_fetch');
jest.mock('./hooks/use_context_app_state');

jest.mock('./context_app_content', () => ({
  ContextAppContent: ({
    addFilter,
  }: {
    addFilter: (field: string, value: unknown, operation: '+' | '-') => Promise<void> | void;
  }) => (
    <div data-test-subj="contextAppContentMock">
      <button
        data-test-subj="contextAppAddFilterButton"
        onClick={() => void addFilter('message', '2021-06-08T07:52:19.000Z', '+')}
      >
        Add filter
      </button>
    </div>
  ),
}));

interface MockTopNavMenuProps {
  appName: string;
  showSearchBar: boolean;
  showQueryInput: boolean;
  showFilterBar: boolean;
  showDatePicker: boolean;
  indexPatterns: Array<{ id?: string }>;
  useDefaultBehaviors: boolean;
}

const mockTopNavMenu = ({
  appName,
  showSearchBar,
  showQueryInput,
  showFilterBar,
  showDatePicker,
  indexPatterns,
  useDefaultBehaviors,
}: MockTopNavMenuProps) => (
  <div
    data-test-subj="mockTopNavMenu"
    data-app-name={appName}
    data-show-search-bar={String(showSearchBar)}
    data-show-query-input={String(showQueryInput)}
    data-show-filter-bar={String(showFilterBar)}
    data-show-date-picker={String(showDatePicker)}
    data-index-pattern-ids={indexPatterns.map(({ id }) => id).join(',')}
    data-use-default-behaviors={String(useDefaultBehaviors)}
  />
);

const mockNavigationPlugin = {
  ui: { TopNavMenu: mockTopNavMenu, AggregateQueryTopNavMenu: mockTopNavMenu },
} as unknown as NavigationPublicStart;
const services = createDiscoverServicesMock();
const addFiltersMock = jest.spyOn(services.filterManager, 'addFilters');
const updateSavedObjectMock = jest.spyOn(services.dataViews, 'updateSavedObject');
const mockUseContextAppFetch = jest.mocked(useContextAppFetch);
const mockUseContextAppState = jest.mocked(useContextAppState);

const appState: AppState = {
  columns: ['message'],
  filters: [],
  grid: {},
  predecessorCount: 5,
  sort: [['@timestamp', 'desc']],
  successorCount: 5,
};

const globalState: GlobalState = {
  filters: [],
};

const stateContainer: GetStateReturn = {
  appState: createStateContainer<AppState>(appState),
  globalState: createStateContainer<GlobalState>(globalState),
  flushToUrl: jest.fn(),
  getFilters: jest.fn(() => []),
  setAppState: jest.fn(),
  setFilters: jest.fn(),
  startSync: jest.fn(),
  stopSync: jest.fn(),
};

const anchorRecord = buildDataTableRecord(
  {
    _id: 'anchor-record',
    _index: 'the-index',
    _score: 1,
    _source: { message: 'anchor' },
  },
  dataViewMock
);

const settledVoidResults: [PromiseSettledResult<void>, PromiseSettledResult<void>] = [
  { status: 'fulfilled', value: undefined },
  { status: 'fulfilled', value: undefined },
];

services.navigation = mockNavigationPlugin;
services.uiSettings = uiSettingsMock;

describe('ContextApp test', () => {
  const defaultProps: ContextAppProps = {
    dataView: dataViewMock,
    anchorId: 'mocked_anchor_id',
  };

  const topNavProps = {
    appName: 'context',
    showSearchBar: true,
    showQueryInput: false,
    showFilterBar: true,
    showDatePicker: false,
    indexPatterns: [dataViewMock],
    useDefaultBehaviors: true,
  };

  const renderComponent = () => {
    renderWithKibanaRenderContext(
      <DiscoverTestProvider services={services}>
        <ContextApp {...defaultProps} />
      </DiscoverTestProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseContextAppState.mockReturnValue({
      appState,
      globalState,
      stateContainer,
    });

    mockUseContextAppFetch.mockReturnValue({
      fetchedState: {
        anchor: anchorRecord,
        anchorInterceptedWarnings: [],
        anchorStatus: { value: LoadingStatus.LOADED },
        predecessors: [],
        predecessorsInterceptedWarnings: [],
        predecessorsStatus: { value: LoadingStatus.LOADED },
        successors: [],
        successorsInterceptedWarnings: [],
        successorsStatus: { value: LoadingStatus.LOADED },
      },
      fetchAllRows: jest.fn(async () => settledVoidResults),
      fetchContextRows: jest.fn(async () => settledVoidResults),
      fetchSurroundingRows: jest.fn(async () => undefined),
      resetFetchedState: jest.fn(),
    });
  });

  it('renders correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('contextAppContentMock')).toBeInTheDocument();
      expect(screen.getByTestId('mockTopNavMenu')).toBeInTheDocument();
    });

    const topNav = screen.getByTestId('mockTopNavMenu');
    expect(topNav).toHaveAttribute('data-app-name', topNavProps.appName);
    expect(topNav).toHaveAttribute('data-show-search-bar', String(topNavProps.showSearchBar));
    expect(topNav).toHaveAttribute('data-show-query-input', String(topNavProps.showQueryInput));
    expect(topNav).toHaveAttribute('data-show-filter-bar', String(topNavProps.showFilterBar));
    expect(topNav).toHaveAttribute('data-show-date-picker', String(topNavProps.showDatePicker));
    expect(topNav).toHaveAttribute('data-index-pattern-ids', dataViewMock.id);
    expect(topNav).toHaveAttribute(
      'data-use-default-behaviors',
      String(topNavProps.useDefaultBehaviors)
    );
  });

  it('should set filters correctly', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByTestId('contextAppAddFilterButton'));

    expect(addFiltersMock).toHaveBeenCalledTimes(1);
    expect(addFiltersMock).toHaveBeenCalledWith([
      {
        $state: { store: 'appState' },
        meta: { alias: null, disabled: false, index: 'the-data-view-id', negate: false },
        query: { match_phrase: { message: '2021-06-08T07:52:19.000Z' } },
      },
    ]);
    expect(updateSavedObjectMock).toHaveBeenCalledTimes(1);
    expect(updateSavedObjectMock).toHaveBeenCalledWith(dataViewMock, 0, true);
  });
});
