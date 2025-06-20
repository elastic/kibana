/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { render } from '@testing-library/react';

import { take } from 'lodash';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListDisplaySettings } from '../../../../../common/options_list';
import { MAX_OPTIONS_LIST_BULK_SELECT_SIZE } from '../constants';

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
    { value: 'beep', docCount: 9 },
    { value: 'chirp', docCount: 10 },
    { value: 'baa', docCount: 11 },
    { value: 'toot', docCount: 11 },
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
        <OptionsListPopoverActionBar
          showOnlySelected={showOnlySelected ?? false}
          setShowOnlySelected={() => {}}
        />
      </OptionsListControlContext.Provider>
    );
  };

  test('displays search input', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(allOptions.length);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    contextMock.componentApi.setSearchString('moo');
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-control-search-input')).toBeEnabled();
    expect(actionBarComponent.queryByTestId('optionsList-control-search-input')).toHaveValue('moo');
  });

  test('displays total cardinality for available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(allOptions.length);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-cardinality-label')).toHaveTextContent(
      allOptions.length.toString()
    );
  });

  test('displays "Select all" checkbox next to total cardinality', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(80);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 10));
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeEnabled();
    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).not.toBeChecked();
  });

  test('Select all is checked when all available options are selected ', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(80);
    contextMock.componentApi.setAvailableOptions([{ value: 'moo', docCount: 1 }]);
    contextMock.componentApi.setSelectedOptions(['moo']);
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeEnabled();
    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeChecked();
  });

  test('bulk selections are disabled when there are more than 100 available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(MAX_OPTIONS_LIST_BULK_SELECT_SIZE + 1);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 10));
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeDisabled();
  });

  test('bulk selections are disabled when there are no available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(0);
    contextMock.componentApi.setAvailableOptions([]);
    const actionBarComponent = mountComponent(contextMock);

    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeDisabled();
  });

  test('bulk selections are disabled when showOnlySelected is true', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(0);
    contextMock.componentApi.setAvailableOptions([]);
    const actionBarComponent = mountComponent({ ...contextMock, showOnlySelected: true });

    expect(actionBarComponent.queryByTestId('optionsList-control-selectAll')).toBeDisabled();
  });
});
