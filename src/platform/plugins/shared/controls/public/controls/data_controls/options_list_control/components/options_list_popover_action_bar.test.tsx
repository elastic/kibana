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
import { take } from 'lodash';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import type { OptionsListDisplaySettings } from '@kbn/controls-schemas';
import { MAX_OPTIONS_LIST_BULK_SELECT_SIZE } from '../constants';

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

const renderComponent = ({
  componentApi,
  displaySettings,
  showOnlySelected,
  disableMultiValueEmptySelection = false,
}: {
  componentApi: OptionsListComponentApi;
  displaySettings: OptionsListDisplaySettings;
  showOnlySelected?: boolean;
  disableMultiValueEmptySelection?: boolean;
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
        disableMultiValueEmptySelection={disableMultiValueEmptySelection}
      />
    </OptionsListControlContext.Provider>
  );
};

const getSelectAllCheckbox = () => screen.queryByRole('checkbox', { name: /Select all/i });

const getSearchInput = () => screen.getByRole('searchbox', { name: /Filter suggestions/i });

describe('Options list popover', () => {
  test('displays search input', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(allOptions.length);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    contextMock.componentApi.setSearchString('moo');
    renderComponent(contextMock);

    expect(getSearchInput()).toBeEnabled();
    expect(getSearchInput()).toHaveValue('moo');
  });

  test('displays total cardinality for available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(allOptions.length);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 5));
    renderComponent(contextMock);

    expect(screen.getByTestId('optionsList-cardinality-label')).toHaveTextContent(
      allOptions.length.toString()
    );
  });

  test('displays "Select all" checkbox next to total cardinality', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(80);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 10));
    renderComponent(contextMock);

    expect(getSelectAllCheckbox()).toBeEnabled();
    expect(getSelectAllCheckbox()).not.toBeChecked();
  });

  test('hides "Select all" checkbox if the control only allows single selections', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(80);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 10));
    contextMock.componentApi.setSingleSelect(true);
    renderComponent(contextMock);

    expect(getSelectAllCheckbox()).not.toBeInTheDocument();
  });

  test('Select all is checked when all available options are selected ', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(80);
    contextMock.componentApi.setAvailableOptions([{ value: 'moo', docCount: 1 }]);
    contextMock.componentApi.setSelectedOptions(['moo']);
    renderComponent(contextMock);

    expect(getSelectAllCheckbox()).toBeEnabled();
    expect(getSelectAllCheckbox()).toBeChecked();
  });

  test('bulk selections are disabled when there are more than 100 available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(MAX_OPTIONS_LIST_BULK_SELECT_SIZE + 1);
    contextMock.componentApi.setAvailableOptions(take(allOptions, 10));
    renderComponent(contextMock);

    expect(getSelectAllCheckbox()).toBeDisabled();
  });

  test('bulk selections are disabled when there are no available options', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(0);
    contextMock.componentApi.setAvailableOptions([]);
    renderComponent(contextMock);

    expect(getSelectAllCheckbox()).toBeDisabled();
  });

  test('bulk selections are disabled when showOnlySelected is true', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(0);
    contextMock.componentApi.setAvailableOptions([]);
    renderComponent({ ...contextMock, showOnlySelected: true });

    expect(getSelectAllCheckbox()).toBeDisabled();
  });

  test('bulk selections are disabled when multi-value empty selection is disabled and all options are selected', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.componentApi.setTotalCardinality(3);
    contextMock.componentApi.setAvailableOptions([
      { value: 'moo', docCount: 1 },
      { value: 'miau', docCount: 2 },
      { value: 'oink', docCount: 3 },
    ]);
    contextMock.componentApi.setSelectedOptions(['moo', 'miau', 'oink']);
    renderComponent({
      ...contextMock,
      disableMultiValueEmptySelection: true,
    });

    expect(getSelectAllCheckbox()).toBeDisabled();
  });
});
