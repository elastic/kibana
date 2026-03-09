/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendWhereClauseToESQLQuery } from '@kbn/esql-utils';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { DataSourceType } from '../../../../../../common/data_sources';
import { getPersistedTabMock } from '../__mocks__/internal_state.mocks';
import { internalStateActions, selectTab, selectTabRuntimeState } from '..';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  const persistedTab = getPersistedTabMock({
    dataView: dataViewMockWithTimeField,
    services,
    appStateOverrides: {
      query: { esql: 'FROM test-index' },
      dataSource: { type: DataSourceType.Esql },
      columns: ['field1', 'field2'],
    },
  });

  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      tabs: [persistedTab],
    }),
  });
  await toolkit.initializeSingleTab({ tabId: persistedTab.id });

  return {
    ...toolkit,
    tabId: persistedTab.id,
    services,
  };
};

describe('tab_state_filters actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should append a WHERE clause in ES|QL mode', async () => {
    const { internalState, tabId, services } = await setup();

    const state = internalState.getState();
    const tab = selectTab(state, tabId);

    expect(tab.appState.query).toStrictEqual({ esql: 'FROM test-index' });

    const setQuerySpy = jest.spyOn(services.data.query.queryString, 'setQuery');

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: 'status',
        value: 200,
        mode: '+',
      })
    );

    expect(setQuerySpy).toHaveBeenCalledWith({
      esql: appendWhereClauseToESQLQuery('FROM test-index', 'status', 200, '+'),
    });
  });

  it('should add classic filter in non-ES|QL mode', async () => {
    const { internalState, tabId, services, runtimeStateManager } = await setup();
    const addFiltersSpy = jest.spyOn(services.filterManager, 'addFilters');
    const trackUiMetricSpy = jest.spyOn(services, 'trackUiMetric');
    const trackFilterAdditionSpy = jest.spyOn(
      selectTabRuntimeState(runtimeStateManager, tabId).scopedEbtManager$.getValue(),
      'trackFilterAddition'
    );

    internalState.dispatch(
      internalStateActions.setAppState({
        tabId,
        appState: {
          query: { language: 'kuery', query: '' },
          dataSource: {
            type: DataSourceType.DataView,
            dataViewId: dataViewMockWithTimeField.id ?? 'test-data-view-id',
          },
        },
      })
    );

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: 'status',
        value: 200,
        mode: '+',
      })
    );

    expect(addFiltersSpy).toHaveBeenCalled();
    expect(trackUiMetricSpy).toHaveBeenCalledWith('click', 'filter_added');
    expect(trackFilterAdditionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ fieldName: 'status', filterOperation: '+' })
    );
  });

  it('should not add a filter when field is undefined', async () => {
    const { internalState, tabId, services } = await setup();
    const addFiltersSpy = jest.spyOn(services.filterManager, 'addFilters');
    const setQuerySpy = jest.spyOn(services.data.query.queryString, 'setQuery');
    setQuerySpy.mockClear();

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: undefined,
        value: 200,
        mode: '+',
      })
    );

    expect(addFiltersSpy).not.toHaveBeenCalled();
    expect(setQuerySpy).not.toHaveBeenCalled();
  });

  it('should not add a filter when current data view is missing', async () => {
    const { internalState, tabId, services, runtimeStateManager } = await setup();
    const addFiltersSpy = jest.spyOn(services.filterManager, 'addFilters');
    const setQuerySpy = jest.spyOn(services.data.query.queryString, 'setQuery');
    setQuerySpy.mockClear();

    selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.next(undefined);

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: 'status',
        value: 200,
        mode: '+',
      })
    );

    expect(addFiltersSpy).not.toHaveBeenCalled();
    expect(setQuerySpy).not.toHaveBeenCalled();
  });

  it('should handle _exists_ operator in ES|QL mode', async () => {
    const { internalState, tabId, services } = await setup();
    const setQuerySpy = jest.spyOn(services.data.query.queryString, 'setQuery');

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: '_exists_',
        value: 'host.name',
        mode: '+',
      })
    );

    expect(setQuerySpy).toHaveBeenCalledWith({
      esql: appendWhereClauseToESQLQuery('FROM test-index', 'host.name', undefined, 'is_not_null'),
    });
  });

  it('should map null exclusion to is_not_null in ES|QL mode', async () => {
    const { internalState, tabId, services } = await setup();
    const setQuerySpy = jest.spyOn(services.data.query.queryString, 'setQuery');

    internalState.dispatch(
      internalStateActions.addFilter({
        tabId,
        field: 'status',
        value: null,
        mode: '-',
      })
    );

    expect(setQuerySpy).toHaveBeenCalledWith({
      esql: appendWhereClauseToESQLQuery('FROM test-index', 'status', undefined, 'is_not_null'),
    });
  });
});
