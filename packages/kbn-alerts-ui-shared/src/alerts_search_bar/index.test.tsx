/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { useLoadRuleTypesQuery, useRuleAADFields, useAlertsDataView } from '../common/hooks';
import { AlertsSearchBar } from '.';
import { HttpStart } from '@kbn/core-http-browser';

const mockDataPlugin = dataPluginMock.createStartContract();
jest.mock('@kbn/kibana-utils-plugin/public');
jest.mock('../common/hooks');

jest.mocked(useAlertsDataView).mockReturnValue({
  isLoading: false,
  dataView: {
    title: '.alerts-*',
    fields: [
      {
        name: 'event.action',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
});

jest.mocked(useLoadRuleTypesQuery).mockReturnValue({
  ruleTypesState: {
    isInitialLoad: false,
    data: new Map(),
    isLoading: false,
    error: null,
  },
  authorizedToReadAnyRules: false,
  hasAnyAuthorizedRuleType: false,
  authorizedRuleTypes: [],
  authorizedToCreateAnyRules: false,
  isSuccess: false,
});

jest.mocked(useRuleAADFields).mockReturnValue({
  aadFields: [],
  loading: false,
});

const unifiedSearchBarMock = jest.fn().mockImplementation((props) => (
  <button
    data-test-subj="querySubmitButton"
    onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
    type="button"
  >
    {'Hello world'}
  </button>
));

const toastsMock = { toasts: { addWarning: jest.fn() } } as unknown as ToastsStart;
const httpMock = {
  post: jest.fn(),
} as unknown as HttpStart;

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        onFiltersUpdated={jest.fn()}
        appName={'test'}
        featureIds={['observability', 'stackAlerts']}
        unifiedSearchBar={unifiedSearchBarMock}
        toasts={toastsMock}
        http={httpMock}
        dataService={mockDataPlugin}
      />
    );
    expect(await screen.findByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('calls onQuerySubmit correctly', async () => {
    const onQuerySubmitMock = jest.fn();

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={onQuerySubmitMock}
        onFiltersUpdated={jest.fn()}
        unifiedSearchBar={unifiedSearchBarMock}
        toasts={toastsMock}
        http={httpMock}
        dataService={mockDataPlugin}
        appName={'test'}
        featureIds={['observability', 'stackAlerts']}
      />
    );

    fireEvent.click(await screen.findByTestId('querySubmitButton'));

    await waitFor(() => {
      expect(onQuerySubmitMock).toHaveBeenCalled();
    });
  });

  it('calls onFiltersUpdated correctly', async () => {
    const onFiltersUpdatedMock = jest.fn();
    const filters: Filter[] = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
        $state: { store: FilterStateStore.APP_STATE },
      },
    ];

    const newUnifiedSearchBarMock = jest.fn().mockImplementation((props) => (
      <button
        data-test-subj="filtersSubmitButton"
        onClick={() => props.onFiltersUpdated(filters)}
        type="button"
      >
        {'Hello world'}
      </button>
    ));

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        onFiltersUpdated={onFiltersUpdatedMock}
        unifiedSearchBar={newUnifiedSearchBarMock}
        toasts={toastsMock}
        http={httpMock}
        dataService={mockDataPlugin}
        appName={'test'}
        featureIds={['observability', 'stackAlerts']}
      />
    );

    fireEvent.click(await screen.findByTestId('filtersSubmitButton'));

    await waitFor(() => {
      expect(onFiltersUpdatedMock).toHaveBeenCalledWith(filters);
      expect(mockDataPlugin.query.filterManager.setFilters).toHaveBeenCalledWith(filters);
    });
  });
});
