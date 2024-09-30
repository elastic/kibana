/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { act, render, RenderResult, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { OptionsListDisplaySettings } from '../../../../../../common/options_list';
import { getOptionsListMocks } from '../../mocks/api_mocks';
import { ContextStateManager, OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { OptionsListPopover } from './options_list_popover';

describe('Options list popover', () => {
  const waitOneTick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  const mountComponent = ({
    api,
    displaySettings,
    stateManager,
  }: {
    api: any;
    displaySettings: any;
    stateManager: any;
  }) => {
    return render(
      <OptionsListControlContext.Provider
        value={{
          api: api as unknown as OptionsListComponentApi,
          displaySettings,
          stateManager: stateManager as unknown as ContextStateManager,
        }}
      >
        <OptionsListPopover />
      </OptionsListControlContext.Provider>
    );
  };

  const clickShowOnlySelections = async (popover: RenderResult) => {
    const showOnlySelectedButton = popover.getByTestId('optionsList-control-show-only-selected');
    await userEvent.click(showOnlySelectedButton);
  };

  test('no available options', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.availableOptions$.next([]);
    const popover = mountComponent(mocks);

    const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
    const noOptionsDiv = within(availableOptionsDiv).getByTestId(
      'optionsList-control-noSelectionsMessage'
    );
    expect(noOptionsDiv).toBeInTheDocument();
  });

  test('clicking options calls `makeSelection`', async () => {
    const mocks = getOptionsListMocks();
    mocks.api.availableOptions$.next([
      { value: 'woof', docCount: 5 },
      { value: 'bark', docCount: 10 },
      { value: 'meow', docCount: 12 },
    ]);
    const popover = mountComponent(mocks);

    const existsOption = popover.getByTestId('optionsList-control-selection-exists');
    await userEvent.click(existsOption);
    expect(mocks.api.makeSelection).toBeCalledWith('exists-option', false);

    let woofOption = popover.getByTestId('optionsList-control-selection-woof');
    await userEvent.click(woofOption);
    expect(mocks.api.makeSelection).toBeCalledWith('woof', false);

    // simulate `makeSelection`
    mocks.setSelectedOptions(['woof']);
    await waitOneTick();

    await clickShowOnlySelections(popover);
    woofOption = popover.getByTestId('optionsList-control-selection-woof');
    await userEvent.click(woofOption);
    expect(mocks.api.makeSelection).toBeCalledWith('woof', true);
  });

  describe('show only selected', () => {
    test('show only selected options', async () => {
      const mocks = getOptionsListMocks();
      const selections = ['woof', 'bark'];
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 10 },
        { value: 'meow', docCount: 12 },
      ]);
      const popover = mountComponent(mocks);
      mocks.setSelectedOptions(selections);
      await waitOneTick();

      await clickShowOnlySelections(popover);
      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const availableOptionsList = within(availableOptionsDiv).getByRole('listbox');
      const availableOptions = within(availableOptionsList).getAllByRole('option');
      availableOptions.forEach((child, i) => {
        expect(child).toHaveTextContent(`${selections[i]}. Checked option.`);
      });
    });

    test('display error message when the show only selected toggle is true but there are no selections', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 10 },
        { value: 'meow', docCount: 12 },
      ]);
      mocks.setSelectedOptions([]);
      const popover = mountComponent(mocks);

      await clickShowOnlySelections(popover);
      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const noSelectionsDiv = within(availableOptionsDiv).getByTestId(
        'optionsList-control-selectionsEmptyMessage'
      );
      expect(noSelectionsDiv).toBeInTheDocument();
    });

    test('disable search and sort when show only selected toggle is true', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 10 },
        { value: 'meow', docCount: 12 },
      ]);
      mocks.setSelectedOptions(['woof', 'bark']);
      const popover = mountComponent(mocks);

      let searchBox = popover.getByTestId('optionsList-control-search-input');
      let sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      expect(searchBox).not.toBeDisabled();
      expect(sortButton).not.toBeDisabled();

      await clickShowOnlySelections(popover);
      searchBox = popover.getByTestId('optionsList-control-search-input');
      sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      expect(searchBox).toBeDisabled();
      expect(sortButton).toBeDisabled();
    });
  });

  describe('invalid selections', () => {
    test('test single invalid selection', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 75 },
      ]);
      const popover = mountComponent(mocks);
      mocks.setSelectedOptions(['woof', 'bark']);
      mocks.api.invalidSelections$.next(new Set(['woof']));
      await waitOneTick();

      const validSelection = popover.getByTestId('optionsList-control-selection-bark');
      expect(validSelection).toHaveTextContent('bark. Checked option.');
      expect(
        within(validSelection).getByTestId('optionsList-document-count-badge')
      ).toHaveTextContent('75');
      const title = popover.getByTestId('optionList__invalidSelectionLabel');
      expect(title).toHaveTextContent('Invalid selection');
      const invalidSelection = popover.getByTestId('optionsList-control-invalid-selection-woof');
      expect(invalidSelection).toHaveTextContent('woof. Checked option.');
      expect(invalidSelection).toHaveClass('optionsList__selectionInvalid');
    });

    test('test title when multiple invalid selections', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 75 },
      ]);
      mocks.setSelectedOptions(['bark', 'woof', 'meow']);
      mocks.api.invalidSelections$.next(new Set(['woof', 'meow']));
      const popover = mountComponent(mocks);

      const title = popover.getByTestId('optionList__invalidSelectionLabel');
      expect(title).toHaveTextContent('Invalid selections');
    });
  });

  describe('include/exclude toggle', () => {
    test('should default to exclude = false', async () => {
      const mocks = getOptionsListMocks();
      const popover = mountComponent(mocks);
      const includeButton = popover.getByTestId('optionsList__includeResults');
      const excludeButton = popover.getByTestId('optionsList__excludeResults');
      expect(includeButton).toHaveAttribute('aria-pressed', 'true');
      expect(excludeButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('if exclude = true, select appropriate button in button group', async () => {
      const mocks = getOptionsListMocks();
      const popover = mountComponent(mocks);
      mocks.api.setExclude(true);
      await waitOneTick();

      const includeButton = popover.getByTestId('optionsList__includeResults');
      const excludeButton = popover.getByTestId('optionsList__excludeResults');
      expect(includeButton).toHaveAttribute('aria-pressed', 'false');
      expect(excludeButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('"Exists" option', () => {
    test('if existsSelected = false and no suggestions, then "Exists" does not show up', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([]);
      const popover = mountComponent(mocks);

      mocks.setExistsSelected(false);
      await waitOneTick();

      const existsOption = popover.queryByTestId('optionsList-control-selection-exists');
      expect(existsOption).toBeNull();
    });

    test('if existsSelected = true, "Exists" is the only option when "Show only selected options" is toggled', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.availableOptions$.next([
        { value: 'woof', docCount: 5 },
        { value: 'bark', docCount: 75 },
      ]);
      const popover = mountComponent(mocks);

      mocks.setExistsSelected(true);
      await waitOneTick();
      await clickShowOnlySelections(popover);

      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const availableOptionsList = within(availableOptionsDiv).getByRole('listbox');
      const availableOptions = within(availableOptionsList).getAllByRole('option');
      expect(availableOptions[0]).toHaveTextContent('Exists. Checked option.');
    });
  });

  describe('field formatter', () => {
    const mocks = getOptionsListMocks();
    const mockedFormatter = jest
      .fn()
      .mockImplementation((value: string | number) => `formatted:${value}`);
    mocks.api.fieldFormatter = new BehaviorSubject(
      mockedFormatter as (value: string | number) => string
    );

    afterEach(() => {
      mockedFormatter.mockClear();
    });

    test('uses field formatter on suggestions', async () => {
      mocks.api.availableOptions$.next([
        { value: 1000, docCount: 1 },
        { value: 123456789, docCount: 4 },
      ]);
      mocks.api.field$.next({
        name: 'Test number field',
        type: 'number',
      } as DataViewField);
      const popover = mountComponent(mocks);

      expect(mockedFormatter).toHaveBeenNthCalledWith(1, 1000);
      expect(mockedFormatter).toHaveBeenNthCalledWith(2, 123456789);
      const options = await popover.findAllByRole('option');
      expect(options[0].textContent).toEqual('Exists');
      expect(
        options[1].getElementsByClassName('euiSelectableListItem__text')[0].textContent
      ).toEqual('formatted:1000');
      expect(
        options[2].getElementsByClassName('euiSelectableListItem__text')[0].textContent
      ).toEqual('formatted:123456789');
    });

    test('converts string to number for date field', async () => {
      mocks.api.availableOptions$.next([
        { value: 1721283696000, docCount: 1 },
        { value: 1721295533000, docCount: 2 },
      ]);
      mocks.api.field$.next({
        name: 'Test date field',
        type: 'date',
      } as DataViewField);

      mountComponent(mocks);
      expect(mockedFormatter).toHaveBeenNthCalledWith(1, 1721283696000);
      expect(mockedFormatter).toHaveBeenNthCalledWith(2, 1721295533000);
    });
  });

  describe('allow expensive queries warning', () => {
    test('ensure warning icon does not show up when testAllowExpensiveQueries = true/undefined', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.field$.next({
        name: 'Test keyword field',
        type: 'keyword',
      } as DataViewField);
      const popover = mountComponent(mocks);
      const warning = popover.queryByTestId('optionsList-allow-expensive-queries-warning');
      expect(warning).toBeNull();
    });

    test('ensure warning icon shows up when testAllowExpensiveQueries = false', async () => {
      const mocks = getOptionsListMocks();
      mocks.api.field$.next({
        name: 'Test keyword field',
        type: 'keyword',
      } as DataViewField);
      mocks.api.parentApi.allowExpensiveQueries$.next(false);
      const popover = mountComponent(mocks);
      const warning = popover.getByTestId('optionsList-allow-expensive-queries-warning');
      expect(warning).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('advanced settings', () => {
    const ensureComponentIsHidden = async ({
      displaySettings,
      testSubject,
    }: {
      displaySettings: Partial<OptionsListDisplaySettings>;
      testSubject: string;
    }) => {
      const mocks = getOptionsListMocks();
      mocks.displaySettings = displaySettings;
      const popover = mountComponent(mocks);
      const test = popover.queryByTestId(testSubject);
      expect(test).toBeNull();
    };

    test('can hide exists option', async () => {
      ensureComponentIsHidden({
        displaySettings: { hideExists: true },
        testSubject: 'optionsList-control-selection-exists',
      });
    });

    test('can hide include/exclude toggle', async () => {
      ensureComponentIsHidden({
        displaySettings: { hideExclude: true },
        testSubject: 'optionsList__includeExcludeButtonGroup',
      });
    });

    test('can hide sorting button', async () => {
      ensureComponentIsHidden({
        displaySettings: { hideSort: true },
        testSubject: 'optionsListControl__sortingOptionsButton',
      });
    });
  });
});
