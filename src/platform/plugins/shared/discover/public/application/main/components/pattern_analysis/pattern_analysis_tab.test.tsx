/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { PatternAnalysisTab } from './pattern_analysis_tab';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions, selectTabRuntimeState } from '../../state_management/redux';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';

const dataView = dataViewWithTimefieldMock;

// Mock the PatternAnalysisTable component to make testing easier
jest.mock('./pattern_analysis_table', () => ({
  PatternAnalysisTable: jest.fn(({ savedSearch }) => (
    <div data-test-subj="mockPatternAnalysisTable">
      <div data-test-subj="searchSourceData">
        {JSON.stringify({
          query: savedSearch?.searchSource?.getSerializedFields?.()?.query,
          filters: savedSearch?.searchSource?.getSerializedFields?.()?.filter,
          dataViewId: savedSearch?.searchSource?.getSerializedFields?.()?.index,
        })}
      </div>
    </div>
  )),
}));

describe('PatternAnalysisTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getStateContainer = (toolkit: ReturnType<typeof getDiscoverInternalStateMock>) => {
    return selectTabRuntimeState(
      toolkit.runtimeStateManager,
      toolkit.getCurrentTab().id
    ).stateContainer$.getValue()!;
  };

  const getComponent = (toolkit: ReturnType<typeof getDiscoverInternalStateMock>) => {
    const props = {
      dataView,
      stateContainer: getStateContainer(toolkit),
      switchToDocumentView: jest.fn(),
      trackUiMetric: jest.fn(),
      renderViewModeToggle: jest.fn(() => <div data-test-subj="viewModeToggle">Toggle</div>),
    };

    return (
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <PatternAnalysisTab {...props} />
      </DiscoverToolkitTestProvider>
    );
  };

  const setup = async ({
    query = { query: 'test query', language: 'kuery' },
    filters = [] as Filter[],
  }: {
    query?: { query: string; language: string };
    filters?: Filter[];
  } = {}) => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();
    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    // Set initial app state
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: {
          query,
          filters,
        },
      })
    );

    const result = render(getComponent(toolkit));

    return { ...result, toolkit, stateContainer };
  };

  const getSearchSourceData = () => {
    const element = screen.getByTestId('searchSourceData');
    return JSON.parse(element.textContent || '{}');
  };

  describe('searchSource creation and updates', () => {
    it('should create searchSource with initial state and pass it to PatternAnalysisTable', async () => {
      const query = { query: 'initial query', language: 'kuery' };
      const filters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match_all: {} },
        },
      ];

      await setup({ query, filters });

      await waitFor(() => {
        expect(screen.getByTestId('mockPatternAnalysisTable')).toBeInTheDocument();
      });

      const searchSourceData = getSearchSourceData();
      expect(searchSourceData.query).toEqual(query);
      expect(searchSourceData.filters).toEqual(filters);
      expect(searchSourceData.dataViewId).toBe(dataView.id);
    });

    it('should update searchSource when query changes significantly', async () => {
      const initialQuery = { query: 'initial query', language: 'kuery' };
      const { toolkit, rerender } = await setup({ query: initialQuery });

      // Verify initial searchSource
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        expect(searchSourceData.query).toEqual(initialQuery);
      });

      // Update the query
      const newQuery = { query: 'updated query', language: 'kuery' };
      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            query: newQuery,
          },
        })
      );

      // Force re-render to reflect the state change
      rerender(getComponent(toolkit));

      // Verify searchSource was updated
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        expect(searchSourceData.query).toEqual(newQuery);
      });
    });

    it('should update searchSource when filters change', async () => {
      const initialFilters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { field1: 'value1' } },
        },
      ];
      const { toolkit, rerender } = await setup({ filters: initialFilters });

      // Verify initial filters
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        expect(searchSourceData.filters).toEqual(initialFilters);
      });

      // Update filters
      const newFilters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { field2: 'value2' } },
        },
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { field3: 'value3' } },
        },
      ];

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            filters: newFilters,
          },
        })
      );

      rerender(getComponent(toolkit));

      // Verify filters were updated
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        expect(searchSourceData.filters).toEqual(newFilters);
      });
    });

    it('should update searchSource when global state filters change', async () => {
      const { toolkit, rerender } = await setup();

      // Set global filters
      const globalFilters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { globalField: 'globalValue' } },
        },
      ];

      toolkit.internalState.dispatch(
        internalStateActions.updateGlobalState({
          tabId: toolkit.getCurrentTab().id,
          globalState: {
            filters: globalFilters,
          },
        })
      );

      rerender(getComponent(toolkit));

      // Verify global filters are included
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        expect(searchSourceData.filters).toContainEqual(globalFilters[0]);
      });
    });

    it('should combine app state and global state filters in searchSource', async () => {
      const appFilters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { appField: 'appValue' } },
        },
      ];
      const globalFilters: Filter[] = [
        {
          meta: { index: 'test', disabled: false, negate: false, alias: null },
          query: { match: { globalField: 'globalValue' } },
        },
      ];

      const { toolkit, rerender } = await setup({ filters: appFilters });

      // Add global filters
      toolkit.internalState.dispatch(
        internalStateActions.updateGlobalState({
          tabId: toolkit.getCurrentTab().id,
          globalState: {
            filters: globalFilters,
          },
        })
      );

      rerender(getComponent(toolkit));

      // Verify both filter sets are included
      await waitFor(() => {
        const searchSourceData = getSearchSourceData();
        // Global filters should come first, then app filters
        expect(searchSourceData.filters).toEqual([...globalFilters, ...appFilters]);
      });
    });
  });
});
