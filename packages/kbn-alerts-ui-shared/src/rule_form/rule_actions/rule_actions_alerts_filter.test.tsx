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
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { FilterStateStore } from '@kbn/es-query';
import { AlertsSearchBarProps, AlertsSearchBar } from '../../alerts_search_bar';
import { getAction } from '../../common/test_utils/actions_test_utils';
import { RuleActionsAlertsFilter } from './rule_actions_alerts_filter';

const http = httpServiceMock.createStartContract();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
}));

jest.mock('../../alerts_search_bar', () => ({
  AlertsSearchBar: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('../hooks');

const mockOnChange = jest.fn();

describe('ruleActionsAlertsFilter', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      plugins: {
        http,
        notifications: {
          toasts: {},
        },
        unifiedSearch: {
          ui: {
            SearchBar: {},
          },
        },
        data: {},
      },
      formData: {
        actions: [],
        consumer: 'stackAlerts',
      },
      selectedRuleType: {
        id: 'selectedRuleTypeId',
        defaultActionGroupId: 'test',
        producer: 'stackAlerts',
      },
    });
  });

  (AlertsSearchBar as jest.Mock<any, any>).mockImplementation(
    ({ onFiltersUpdated, onQueryChange, onQuerySubmit }: AlertsSearchBarProps) => (
      <div>
        AlertsSearchBar
        <button
          onClick={() =>
            onFiltersUpdated?.([
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {},
              },
            ])
          }
        >
          Update Filter
        </button>
        <button
          onClick={() =>
            onQueryChange?.({
              dateRange: { from: 'now', to: 'now' },
              query: 'onQueryChange',
            })
          }
        >
          Update Query
        </button>
        <button
          onClick={() =>
            onQuerySubmit?.({
              dateRange: { from: 'now', to: 'now' },
              query: 'onQuerySubmit',
            })
          }
        >
          Submit Query
        </button>
      </div>
    )
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', () => {
    render(
      <RuleActionsAlertsFilter
        action={getAction('1')}
        onChange={mockOnChange}
        appName="stackAlerts"
        featureIds={['stackAlerts']}
      />
    );

    expect(screen.getByTestId('alertsFilterQueryToggle')).toBeInTheDocument();
  });

  test('should allow for toggling on of query', async () => {
    render(
      <RuleActionsAlertsFilter
        action={getAction('1')}
        onChange={mockOnChange}
        appName="stackAlerts"
        featureIds={['stackAlerts']}
      />
    );

    await userEvent.click(screen.getByTestId('alertsFilterQueryToggle'));

    expect(mockOnChange).toHaveBeenLastCalledWith({ filters: [], kql: '' });
  });

  test('should allow for toggling off of query', async () => {
    render(
      <RuleActionsAlertsFilter
        action={getAction('1', {
          alertsFilter: {
            query: {
              kql: 'test',
              filters: [],
            },
          },
        })}
        onChange={mockOnChange}
        appName="stackAlerts"
        featureIds={['stackAlerts']}
      />
    );

    await userEvent.click(screen.getByTestId('alertsFilterQueryToggle'));

    expect(mockOnChange).toHaveBeenLastCalledWith(undefined);
  });

  test('should allow for changing  query', async () => {
    render(
      <RuleActionsAlertsFilter
        action={getAction('1', {
          alertsFilter: {
            query: {
              kql: 'test',
              filters: [],
            },
          },
        })}
        onChange={mockOnChange}
        appName="stackAlerts"
        featureIds={['stackAlerts']}
      />
    );

    await userEvent.click(screen.getByText('Update Filter'));
    expect(mockOnChange).toHaveBeenLastCalledWith({
      filters: [{ $state: { store: 'appState' }, meta: {}, query: {} }],
      kql: 'test',
    });
    await userEvent.click(screen.getByText('Update Query'));
    expect(mockOnChange).toHaveBeenLastCalledWith({
      filters: [{ $state: { store: 'appState' }, meta: {}, query: {} }],
      kql: 'onQueryChange',
    });
    await userEvent.click(screen.getByText('Submit Query'));
    expect(mockOnChange).toHaveBeenLastCalledWith({
      filters: [{ $state: { store: 'appState' }, meta: {}, query: {} }],
      kql: 'onQuerySubmit',
    });
  });

  test('renders filters correctly', async () => {
    const filters = [
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

    (AlertsSearchBar as jest.Mock<any, any>).mockImplementation(
      ({ onFiltersUpdated, onQueryChange, onQuerySubmit }: AlertsSearchBarProps) => (
        <div>
          AlertsSearchBar
          <button onClick={() => onFiltersUpdated?.(filters)}>Update Filter</button>
          <button
            onClick={() =>
              onQueryChange?.({
                dateRange: { from: 'now', to: 'now' },
                query: 'onQueryChange',
              })
            }
          >
            Update Query
          </button>
          <button
            onClick={() =>
              onQuerySubmit?.({
                dateRange: { from: 'now', to: 'now' },
                query: 'onQuerySubmit',
              })
            }
          >
            Submit Query
          </button>
        </div>
      )
    );

    render(
      <RuleActionsAlertsFilter
        action={getAction('1', {
          alertsFilter: {
            query: {
              kql: '',
              filters: [{ ...filters[0], meta: {} }],
            },
          },
        })}
        onChange={mockOnChange}
        appName="stackAlerts"
        featureIds={['stackAlerts']}
      />
    );

    await userEvent.click(screen.getByTestId('alertsFilterQueryToggle'));

    expect(mockOnChange).toHaveBeenLastCalledWith(undefined);

    await userEvent.click(screen.getByText('Update Filter'));
    expect(mockOnChange).toHaveBeenLastCalledWith({ filters, kql: '' });
  });
});
