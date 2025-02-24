/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';

import { take } from 'lodash';
import { getOptionsListMocks } from '../../mocks/api_mocks';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, MIN_OPTIONS_LIST_REQUEST_SIZE } from '../constants';
import { ContextStateManager, OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';

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
    api,
    displaySettings,
    stateManager,
    showOnlySelected,
  }: {
    api: any;
    displaySettings: any;
    stateManager: any;
    showOnlySelected?: boolean;
  }) => {
    return render(
      <OptionsListControlContext.Provider
        value={{
          api: api as unknown as OptionsListComponentApi,
          displaySettings,
          stateManager: stateManager as unknown as ContextStateManager,
        }}
      >
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected ?? false} />
      </OptionsListControlContext.Provider>
    );
  };

  test('displays "load more" text when possible', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.totalCardinality$.next(allOptions.length);
    mocks.api.availableOptions$.next(take(allOptions, 5));
    const suggestionsComponent = mountComponent(mocks);

    // the cardinality is larger than the available options, so display text
    let optionComponents = await suggestionsComponent.findAllByRole('option');
    expect(optionComponents.length).toBe(6);
    expect(
      suggestionsComponent.queryByTestId('optionsList-control-selection-honk')
    ).not.toBeInTheDocument();
    expect(suggestionsComponent.queryByTestId('optionslist--canLoadMore')).toBeInTheDocument();

    // we are displaying all the available options - so don't display "load more" text
    mocks.api.availableOptions$.next(allOptions);
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
    const mocks = getOptionsListMocks();
    mocks.api.totalCardinality$.next(100);
    mocks.api.availableOptions$.next(take(allOptions, 5));
    const suggestionsComponent = mountComponent(mocks);

    // ensure we fetch the cardinality on scroll
    expect(mocks.stateManager.requestSize.getValue()).toBe(MIN_OPTIONS_LIST_REQUEST_SIZE);
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(mocks.stateManager.requestSize.getValue()).toBe(100);

    // reset request size + update cardinality
    mocks.stateManager.requestSize.next(MIN_OPTIONS_LIST_REQUEST_SIZE);
    mocks.api.totalCardinality$.next(MAX_OPTIONS_LIST_REQUEST_SIZE + 100);
    await waitFor(async () => {
      // wait for request size to be reset in UI
      const optionComponents = await suggestionsComponent.findAllByRole('option');
      expect(optionComponents.length).toBe(6);
    });

    // ensure we don't fetch more than MAX_OPTIONS_LIST_REQUEST_SIZE
    fireEvent.scroll(suggestionsComponent.getByTestId('optionsList--scrollListener'));
    expect(mocks.stateManager.requestSize.getValue()).toBe(MAX_OPTIONS_LIST_REQUEST_SIZE);
  });
});
