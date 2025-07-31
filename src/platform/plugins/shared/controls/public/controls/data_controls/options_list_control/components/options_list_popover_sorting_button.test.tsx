/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { OptionsListControlContext } from '../options_list_context_provider';
import { OptionsListComponentApi } from '../types';
import { OptionsListPopoverSortingButton } from './options_list_popover_sorting_button';
import { OptionsListDisplaySettings } from '../../../../../common/options_list';

describe('Options list sorting button', () => {
  const mountComponent = async ({
    componentApi,
    displaySettings,
  }: {
    componentApi: OptionsListComponentApi;
    displaySettings: OptionsListDisplaySettings;
  }) => {
    const component = render(
      <OptionsListControlContext.Provider
        value={{
          componentApi,
          displaySettings,
        }}
      >
        <OptionsListPopoverSortingButton showOnlySelected={false} />
      </OptionsListControlContext.Provider>
    );

    // open the popover for testing by clicking on the button
    const sortButton = component.getByTestId('optionsListControl__sortingOptionsButton');
    await userEvent.click(sortButton);

    return component;
  };

  test('when sorting suggestions, show both sorting types for keyword field', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setField({
      name: 'Test keyword field',
      type: 'keyword',
    } as DataViewField);
    const component = await mountComponent(contextMock);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'Alphabetically']);
  });

  test('sorting popover selects appropriate sorting type on load', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setField({
      name: 'Test keyword field',
      type: 'keyword',
    } as DataViewField);
    contextMock.componentApi.setSort({ by: '_key', direction: 'asc' });
    const component = await mountComponent(contextMock);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count', 'Alphabetically. Checked option.']);

    const ascendingButton = component.getByTestId('optionsList__sortOrder_asc');
    expect(ascendingButton).toHaveClass('euiButtonGroupButton-isSelected');
    const descendingButton = component.getByTestId('optionsList__sortOrder_desc');
    expect(descendingButton).not.toHaveClass('euiButtonGroupButton-isSelected');
  });

  test('when sorting suggestions, only show document count sorting for IP fields', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setField({ name: 'Test IP field', type: 'ip' } as DataViewField);
    const component = await mountComponent(contextMock);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.']);
  });

  test('when sorting suggestions, show "By date" sorting option for date fields', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setField({
      name: 'Test date field',
      type: 'date',
    } as DataViewField);
    const component = await mountComponent(contextMock);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'By date']);
  });

  test('when sorting suggestions, show "Numerically" sorting option for number fields', async () => {
    const contextMock = getOptionsListContextMock();
    contextMock.testOnlyMethods.setField({
      name: 'Test number field',
      type: 'number',
    } as DataViewField);
    const component = await mountComponent(contextMock);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'Numerically']);
  });
});
