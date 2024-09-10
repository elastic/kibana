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

import { getOptionsListMocks } from '../../mocks/api_mocks';
import { ContextStateManager, OptionsListControlContext } from '../options_list_context_provider';
import { OptionsListComponentApi } from '../types';
import { OptionsListPopoverSortingButton } from './options_list_popover_sorting_button';

describe('Options list sorting button', () => {
  const mountComponent = ({
    api,
    displaySettings,
    stateManager,
  }: {
    api: any;
    displaySettings: any;
    stateManager: any;
  }) => {
    const component = render(
      <OptionsListControlContext.Provider
        value={{
          api: api as unknown as OptionsListComponentApi,
          displaySettings,
          stateManager: stateManager as unknown as ContextStateManager,
        }}
      >
        <OptionsListPopoverSortingButton showOnlySelected={false} />
      </OptionsListControlContext.Provider>
    );

    // open the popover for testing by clicking on the button
    const sortButton = component.getByTestId('optionsListControl__sortingOptionsButton');
    userEvent.click(sortButton);

    return component;
  };

  test('when sorting suggestions, show both sorting types for keyword field', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.field$.next({
      name: 'Test keyword field',
      type: 'keyword',
    } as DataViewField);
    const component = mountComponent(mocks);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'Alphabetically']);
  });

  test('sorting popover selects appropriate sorting type on load', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.field$.next({
      name: 'Test keyword field',
      type: 'keyword',
    } as DataViewField);
    mocks.stateManager.sort.next({ by: '_key', direction: 'asc' });
    const component = mountComponent(mocks);

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
    const mocks = getOptionsListMocks();
    mocks.api.field$.next({ name: 'Test IP field', type: 'ip' } as DataViewField);
    const component = mountComponent(mocks);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.']);
  });

  test('when sorting suggestions, show "By date" sorting option for date fields', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.field$.next({ name: 'Test date field', type: 'date' } as DataViewField);
    const component = mountComponent(mocks);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'By date']);
  });

  test('when sorting suggestions, show "Numerically" sorting option for number fields', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.field$.next({ name: 'Test number field', type: 'number' } as DataViewField);
    const component = mountComponent(mocks);

    const sortingOptionsDiv = component.getByTestId('optionsListControl__sortingOptions');
    const optionsText = within(sortingOptionsDiv)
      .getAllByRole('option')
      .map((el) => el.textContent);
    expect(optionsText).toEqual(['By document count. Checked option.', 'Numerically']);
  });
});
