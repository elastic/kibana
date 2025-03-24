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
import { userEvent } from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import { AlertsFilterByRuleTypes } from './alerts_filter_by_rule_types';
import { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query');
const mockUseGetInternalRuleTypesQuery = useGetInternalRuleTypesQuery as jest.Mock;

const ruleTypeIds = ['.es-query', '.index-threshold'];

describe('AlertsFilterByRuleTypes', () => {
  it('should show all available types as options', async () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [
        { id: '.es-query', name: 'Elasticsearch Query' },
        { id: '.index-threshold', name: 'Index threshold' },
      ] as InternalRuleType[],
      isLoading: false,
      isError: false,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds }}>
        <AlertsFilterByRuleTypes value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Elasticsearch Query')).toBeInTheDocument();
    expect(screen.getByText('Index threshold')).toBeInTheDocument();
  });

  it('should filter available types according to the provided ruleTypeIds', async () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [
        { id: '.es-query', name: 'Elasticsearch Query' },
        { id: '.index-threshold', name: 'Index threshold' },
      ] as InternalRuleType[],
      isLoading: false,
      isError: false,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds: ['.es-query'] }}>
        <AlertsFilterByRuleTypes value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Elasticsearch Query')).toBeInTheDocument();
    expect(screen.queryByText('Index threshold')).not.toBeInTheDocument();
  });

  it('should set the combobox in loading mode while loading the available types', async () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds }}>
        <AlertsFilterByRuleTypes value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should disable the combobox when the types query fails', async () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      types: [],
      isLoading: false,
      isError: true,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds }}>
        <AlertsFilterByRuleTypes value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    const comboboxInput = screen.getByTestId('comboBoxSearchInput');
    expect(comboboxInput).toHaveAttribute('aria-invalid', 'true');
    expect(comboboxInput).toHaveAttribute('disabled');
  });
});
