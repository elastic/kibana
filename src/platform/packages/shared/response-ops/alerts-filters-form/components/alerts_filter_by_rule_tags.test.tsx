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
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import { AlertsFilterByRuleTags } from './alerts_filter_by_rule_tags';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query');
const mockUseGetRuleTagsQuery = jest.mocked(useGetRuleTagsQuery);

const ruleTagsBaseQueryResult = {
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
};

describe('AlertsFilterByRuleTags', () => {
  it('should show all available tags as options', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: ['tag1', 'tag2'],
      isLoading: false,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds: ['.es-query'] }}>
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should set the combobox in loading mode while loading the available tags', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: [],
      isLoading: true,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds: ['.es-query'] }}>
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should disable the combobox when the tags query fails', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: [],
      isLoading: false,
      isError: true,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds: ['.es-query'] }}>
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    const comboboxInput = screen.getByTestId('comboBoxSearchInput');
    expect(comboboxInput).toHaveAttribute('aria-invalid', 'true');
    expect(comboboxInput).toHaveAttribute('disabled');
  });
});
