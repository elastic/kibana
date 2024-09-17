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
import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleActionsAlertsFilter } from './rule_actions_alerts_filter';
import type { AlertsSearchBarProps } from '../../alerts_search_bar';
import { FilterStateStore } from '@kbn/es-query';
import { getAction } from '../../common/test_utils/actions_test_utils';
import userEvent from '@testing-library/user-event';

const http = httpServiceMock.createStartContract();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
}));

jest.mock('../../alerts_search_bar', () => ({
  AlertsSearchBar: ({ onFiltersUpdated, onQueryChange, onQuerySubmit }: AlertsSearchBarProps) => (
    <div>
      AlertsSearchBar
      <button
        onClick={() =>
          onFiltersUpdated?.([
            {
              $state: { store: 'appState' as FilterStateStore },
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
  ),
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
        dataViews: {},
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
      filters: [{ $state: { store: 'appState' }, meta: {} }],
      kql: 'test',
    });
    await userEvent.click(screen.getByText('Update Query'));
    expect(mockOnChange).toHaveBeenLastCalledWith({ filters: [], kql: 'onQueryChange' });
    await userEvent.click(screen.getByText('Submit Query'));
    expect(mockOnChange).toHaveBeenLastCalledWith({ filters: [], kql: 'onQuerySubmit' });
  });
});
