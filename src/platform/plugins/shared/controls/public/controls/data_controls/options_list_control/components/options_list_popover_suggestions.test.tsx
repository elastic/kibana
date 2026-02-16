/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { take } from 'lodash';

import { fireEvent, render as rtlRender, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { OptionsListDisplaySettings } from '@kbn/controls-schemas';

const mockHttpPost = jest.fn();
const mockHttpFetch = jest.fn();
jest.mock('../../../../services/kibana_services', () => {
  return {
    coreServices: {
      http: {
        post: (...args: unknown[]) => mockHttpPost(...args),
        fetch: (...args: unknown[]) => mockHttpFetch(...args),
      },
    },
  };
});

import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, MIN_OPTIONS_LIST_REQUEST_SIZE } from '../constants';
import { OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: EuiThemeProvider });
};

describe('Options list popover', () => {
  const allOptions = [
    { value: 'moo', docCount: 1 },
    { value: 'tweet', docCount: 2 },
    { value: 'oink', docCount: 3 },
    { value: 'bark', docCount: 4 },
    { value: 'meow', docCount: 5 },
    { value: 'woof', docCount: 6 },
    { value: 'roar', docCount: 7 },
    { value: 'honk', docCount: 8 },
  ];

  const mountComponent = ({
    componentApi,
    displaySettings,
    showOnlySelected,
  }: {
    componentApi: OptionsListComponentApi;
    displaySettings: OptionsListDisplaySettings;
    showOnlySelected?: boolean;
  }) => {
    return render(
      <OptionsListControlContext.Provider
        value={{
          componentApi,
          displaySettings,
        }}
      >
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected ?? false} />
      </OptionsListControlContext.Provider>
    );
  };

  test('displays "load more" text when possible', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(allOptions.length);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    const suggestionsComponent = mountComponent(contextMock);

    // the cardinality is larger than the available options, so display text
    let optionComponents = await suggestionsComponent.findAllByRole('option');
    expect(optionComponents.length).toBe(6);
    expect(
      suggestionsComponent.queryByTestId('optionsList-control-selection-honk')
    ).not.toBeInTheDocument();
    expect(suggestionsComponent.queryByTestId('optionslist--canLoadMore')).toBeInTheDocument();

    // we are displaying all the available options - so don't display "load more" text
    contextMock.componentApi.setAvailableOptions(allOptions);
    await waitFor(async () => {
      optionComponents = await suggestionsComponent.findAllByRole('option');
      expect(optionComponents.length).toBe(9);
    });
    expect(
      suggestionsComponent.queryByTestId('optionsList-control-selection-honk')
    ).toBeInTheDocument();
    expect(suggestionsComponent.queryByTestId('optionslist--canLoadMore')).not.toBeInTheDocument();
  });

  test('only fetch up to maximum request size on scroll', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(100);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    const suggestionsComponent = mountComponent(contextMock);

    // ensure we fetch the cardinality on scroll
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(MIN_OPTIONS_LIST_REQUEST_SIZE);
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(100);

    // reset request size + update cardinality
    contextMock.componentApi.setRequestSize(MIN_OPTIONS_LIST_REQUEST_SIZE);
    contextMock.componentApi.setTotalCardinality(MAX_OPTIONS_LIST_REQUEST_SIZE + 100);
    await waitFor(async () => {
      // wait for request size to be reset in UI
      const optionComponents = await suggestionsComponent.findAllByRole('option');
      expect(optionComponents.length).toBe(6);
    });

    // ensure we don't fetch more than MAX_OPTIONS_LIST_REQUEST_SIZE
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(MAX_OPTIONS_LIST_REQUEST_SIZE);
  });

  test('renders available options for assignee ids field', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setAvailableOptions([{ value: 'uid-1', docCount: 1 }]);

    const suggestionsComponent = mountComponent(contextMock);

    await waitFor(() => {
      expect(suggestionsComponent.getByText('uid-1')).toBeInTheDocument();
    });
  });

  test('assignee field does not render a local search input in this component', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setAvailableOptions([
      { value: 'uid-1', docCount: 1 },
      { value: 'uid-2', docCount: 1 },
    ]);

    const suggestionsComponent = mountComponent(contextMock);

    await waitFor(() => {
      expect(suggestionsComponent.getByText('uid-1')).toBeInTheDocument();
      expect(suggestionsComponent.getByText('uid-2')).toBeInTheDocument();
    });
    expect(
      suggestionsComponent.queryByTestId('optionsList-assignee-search-input')
    ).not.toBeInTheDocument();
  });

  test('assignee search does not call user profile suggest in this component', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setSearchString('user');

    const suggestionsComponent = mountComponent(contextMock);

    await waitFor(() => {
      expect(suggestionsComponent.getByText('No options found')).toBeInTheDocument();
    });
    expect(mockHttpFetch).not.toHaveBeenCalled();
    expect(mockHttpPost).not.toHaveBeenCalled();
  });

  test('assignee search falls back to default suggestions when user search fails', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setAvailableOptions([{ value: 'uid-1', docCount: 1 }]);
    contextMock.componentApi.setSearchString('user');

    mockHttpFetch.mockRejectedValueOnce(new Error('forbidden'));
    mockHttpPost.mockImplementation(async (path: string) => {
      if (path === '/internal/security/user_profile/_bulk_get') return [];
      return [];
    });

    const suggestionsComponent = mountComponent(contextMock);

    await waitFor(() => {
      expect(suggestionsComponent.getByText('uid-1')).toBeInTheDocument();
    });
  });

  test('hideExists removes exists option and still allows selecting available values', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setAvailableOptions([{ value: 'uid-1', docCount: 1 }]);
    // emulate FilterGroup hiding the built-in exists option
    const suggestionsComponent = mountComponent({
      ...contextMock,
      displaySettings: { hideExists: true } as any,
    });

    const option = await suggestionsComponent.findByTestId('optionsList-control-selection-uid-1');
    fireEvent.click(option);

    expect(
      suggestionsComponent.queryByTestId('optionsList-control-selection-exists')
    ).not.toBeInTheDocument();
    expect(contextMock.componentApi.makeSelection).toHaveBeenCalledWith('uid-1', false);
  });

  test('does not fetch user profiles for non-assignee fields', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.fieldName$.next('host.name');
    contextMock.componentApi.setAvailableOptions([{ value: 'uid-1', docCount: 1 }]);

    const suggestionsComponent = mountComponent(contextMock);

    await waitFor(async () => {
      const optionComponents = await suggestionsComponent.findAllByRole('option');
      expect(optionComponents.length).toBeGreaterThan(0);
    });

    expect(mockHttpPost).not.toHaveBeenCalled();
    expect(mockHttpFetch).not.toHaveBeenCalled();
    // Default behavior: raw value is displayed.
    expect(suggestionsComponent.getByText('uid-1')).toBeInTheDocument();
  });
});
