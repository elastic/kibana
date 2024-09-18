/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { Filter } from '@kbn/es-query';
import { useLoadRuleTypesQuery, useAlertsDataView, useRuleAADFields } from '../common/hooks';
import { AlertsSearchBar } from '.';

jest.mock('../common/hooks/use_load_rule_types_query');
jest.mock('../common/hooks/use_rule_aad_fields');
jest.mock('../common/hooks/use_alerts_data_view');

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

const mockDataPlugin = dataPluginMock.createStartContract();
const unifiedSearchBarMock = jest.fn().mockImplementation((props) => (
  <button
    data-test-subj="querySubmitButton"
    onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
    type="button"
  >
    {'Hello world'}
  </button>
));
const httpMock = httpServiceMock.createStartContract();
const toastsMock = notificationServiceMock.createStartContract().toasts;

describe('AlertsSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        initialFilters={[]}
        onFiltersUpdated={jest.fn()}
        appName={'test'}
        dataService={mockDataPlugin}
        featureIds={['observability', 'stackAlerts']}
        unifiedSearchBar={unifiedSearchBarMock}
        http={httpMock}
        toasts={toastsMock}
      />
    );
    expect(screen.getByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('renders initial filters correctly', () => {
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
        $state: { store: 'appState' },
      },
    ] as Filter[];

    render(
      <AlertsSearchBar
        rangeFrom="now/d"
        rangeTo="now/d"
        query=""
        onQuerySubmit={jest.fn()}
        initialFilters={filters}
        onFiltersUpdated={jest.fn()}
        appName={'test'}
        dataService={mockDataPlugin}
        featureIds={['observability', 'stackAlerts']}
        unifiedSearchBar={unifiedSearchBarMock}
        http={httpMock}
        toasts={toastsMock}
      />
    );

    expect(mockDataPlugin.query.filterManager.addFilters).toHaveBeenCalledWith(filters);
  });
});
