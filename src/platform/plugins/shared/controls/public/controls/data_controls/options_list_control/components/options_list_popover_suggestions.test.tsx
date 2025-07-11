/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { fireEvent, render as rtlRender, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import { take } from 'lodash';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, MIN_OPTIONS_LIST_REQUEST_SIZE } from '../constants';
import { OptionsListControlContextProvider } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListDisplaySettings } from '../../../../../common/options_list';

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
      <OptionsListControlContextProvider componentApi={componentApi} {...displaySettings}>
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected ?? false} />
      </OptionsListControlContextProvider>
    );
  };

  test('displays "load more" text when possible', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setTotalCardinality(allOptions.length);
    contextMock.testOnlyMethods.setAvailableOptions(take(allOptions, 5));
    const suggestionsComponent = mountComponent(contextMock);

    // the cardinality is larger than the available options, so display text
    let optionComponents = await suggestionsComponent.findAllByRole('option');
    expect(optionComponents.length).toBe(6);
    expect(
      suggestionsComponent.queryByTestId('optionsList-control-selection-honk')
    ).not.toBeInTheDocument();
    expect(suggestionsComponent.queryByTestId('optionslist--canLoadMore')).toBeInTheDocument();

    // we are displaying all the available options - so don't display "load more" text
    contextMock.testOnlyMethods.setAvailableOptions(allOptions);
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
    contextMock.testOnlyMethods.setTotalCardinality(100);
    contextMock.testOnlyMethods.setAvailableOptions(take(allOptions, 5));
    const suggestionsComponent = mountComponent(contextMock);

    // ensure we fetch the cardinality on scroll
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(MIN_OPTIONS_LIST_REQUEST_SIZE);
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(100);

    // reset request size + update cardinality
    contextMock.componentApi.setRequestSize(MIN_OPTIONS_LIST_REQUEST_SIZE);
    contextMock.testOnlyMethods.setTotalCardinality(MAX_OPTIONS_LIST_REQUEST_SIZE + 100);
    await waitFor(async () => {
      // wait for request size to be reset in UI
      const optionComponents = await suggestionsComponent.findAllByRole('option');
      expect(optionComponents.length).toBe(6);
    });

    // ensure we don't fetch more than MAX_OPTIONS_LIST_REQUEST_SIZE
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(contextMock.componentApi.requestSize$.getValue()).toBe(MAX_OPTIONS_LIST_REQUEST_SIZE);
  });
});
