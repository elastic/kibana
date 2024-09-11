/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { render, RenderResult, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { mockOptionsListEmbeddable } from '../../../common/mocks';
import { pluginServices } from '../../services';
import { OptionsListEmbeddableContext } from '../embeddable/options_list_embeddable';
import { OptionsListComponentState, OptionsListReduxState } from '../types';
import { OptionsListPopover, OptionsListPopoverProps } from './options_list_popover';
import { OptionsListEmbeddableInput } from '..';
import { ControlOutput } from '../../types';

describe('Options list popover', () => {
  let user: UserEvent;

  const defaultProps = {
    isLoading: false,
    updateSearchString: jest.fn(),
    loadMoreSuggestions: jest.fn(),
  };

  interface MountOptions {
    componentState: Partial<OptionsListComponentState>;
    explicitInput: Partial<OptionsListEmbeddableInput>;
    output: Partial<ControlOutput>;
    popoverProps: Partial<OptionsListPopoverProps>;
  }

  async function mountComponent(options?: Partial<MountOptions>) {
    const compProps = { ...defaultProps, ...(options?.popoverProps ?? {}) };
    const optionsListEmbeddable = await mockOptionsListEmbeddable({
      componentState: options?.componentState ?? {},
      explicitInput: options?.explicitInput ?? {},
      output: options?.output ?? {},
    } as Partial<OptionsListReduxState>);

    return render(
      <OptionsListEmbeddableContext.Provider value={optionsListEmbeddable}>
        <OptionsListPopover {...compProps} />
      </OptionsListEmbeddableContext.Provider>
    );
  }

  const clickShowOnlySelections = async (popover: RenderResult) => {
    const showOnlySelectedButton = popover.getByTestId('optionsList-control-show-only-selected');
    await user.click(showOnlySelectedButton);
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('no available options', async () => {
    const popover = await mountComponent({ componentState: { availableOptions: [] } });
    const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
    const noOptionsDiv = within(availableOptionsDiv).getByTestId(
      'optionsList-control-noSelectionsMessage'
    );
    expect(noOptionsDiv).toBeInTheDocument();
  });

  describe('show only selected', () => {
    test('display error message when the show only selected toggle is true but there are no selections', async () => {
      const popover = await mountComponent();
      await clickShowOnlySelections(popover);
      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const noSelectionsDiv = within(availableOptionsDiv).getByTestId(
        'optionsList-control-selectionsEmptyMessage'
      );
      expect(noSelectionsDiv).toBeInTheDocument();
    });

    test('show only selected options', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { selectedOptions: selections },
      });
      await clickShowOnlySelections(popover);
      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const availableOptionsList = within(availableOptionsDiv).getByRole('listbox');
      const availableOptions = within(availableOptionsList).getAllByRole('option');
      availableOptions.forEach((child, i) => {
        expect(child).toHaveTextContent(`${selections[i]}. Checked option.`);
      });
    });

    test('disable search and sort when show only selected toggle is true', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { selectedOptions: selections },
        componentState: { field: { type: 'string' } as any as FieldSpec },
      });
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
      const popover = await mountComponent({
        explicitInput: {
          selectedOptions: ['bark', 'woof'],
        },
        componentState: {
          availableOptions: [{ value: 'bark', docCount: 75 }],
          validSelections: ['bark'],
          invalidSelections: ['woof'],
        },
      });
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
      const popover = await mountComponent({
        explicitInput: { selectedOptions: ['bark', 'woof', 'meow'] },
        componentState: {
          availableOptions: [{ value: 'bark', docCount: 75 }],
          validSelections: ['bark'],
          invalidSelections: ['woof', 'meow'],
        },
      });
      const title = popover.getByTestId('optionList__invalidSelectionLabel');
      expect(title).toHaveTextContent('Invalid selections');
    });
  });

  describe('include/exclude toggle', () => {
    test('should default to exclude = false', async () => {
      const popover = await mountComponent();
      const includeButton = popover.getByTestId('optionsList__includeResults');
      const excludeButton = popover.getByTestId('optionsList__excludeResults');
      expect(includeButton).toHaveAttribute('aria-pressed', 'true');
      expect(excludeButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('if exclude = true, select appropriate button in button group', async () => {
      const popover = await mountComponent({
        explicitInput: { exclude: true },
      });
      const includeButton = popover.getByTestId('optionsList__includeResults');
      const excludeButton = popover.getByTestId('optionsList__excludeResults');
      expect(includeButton).toHaveAttribute('aria-pressed', 'false');
      expect(excludeButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('"Exists" option', () => {
    test('clicking another option unselects "Exists"', async () => {
      const popover = await mountComponent({
        explicitInput: { existsSelected: true },
        componentState: { field: { type: 'string' } as FieldSpec },
      });
      const woofOption = popover.getByTestId('optionsList-control-selection-woof');
      await user.click(woofOption);

      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const availableOptionsList = within(availableOptionsDiv).getByRole('listbox');
      const selectedOptions = within(availableOptionsList).getAllByRole('option', {
        checked: true,
      });
      expect(selectedOptions).toHaveLength(1);
      expect(selectedOptions[0]).toHaveTextContent('woof. Checked option.');
    });

    test('clicking "Exists" unselects all other selections', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { existsSelected: false, selectedOptions: selections },
        componentState: { field: { type: 'number' } as FieldSpec },
      });
      const existsOption = popover.getByTestId('optionsList-control-selection-exists');
      let availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      let checkedOptions = within(availableOptionsDiv).getAllByRole('option', { checked: true });
      expect(checkedOptions).toHaveLength(2);
      expect(checkedOptions[0]).toHaveTextContent('woof. Checked option.');
      expect(checkedOptions[1]).toHaveTextContent('bark. Checked option.');

      await user.click(existsOption);
      availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      checkedOptions = within(availableOptionsDiv).getAllByRole('option', { checked: true });
      expect(checkedOptions).toHaveLength(1);
      expect(checkedOptions[0]).toHaveTextContent('Exists. Checked option.');
    });

    test('if existsSelected = false and no suggestions, then "Exists" does not show up', async () => {
      const popover = await mountComponent({
        componentState: { availableOptions: [] },
        explicitInput: { existsSelected: false },
      });
      const existsOption = popover.queryByTestId('optionsList-control-selection-exists');
      expect(existsOption).toBeNull();
    });

    test('if existsSelected = true, "Exists" is the only option when "Show only selected options" is toggled', async () => {
      const popover = await mountComponent({
        explicitInput: { existsSelected: true },
      });
      await clickShowOnlySelections(popover);
      const availableOptionsDiv = popover.getByTestId('optionsList-control-available-options');
      const availableOptionsList = within(availableOptionsDiv).getByRole('listbox');
      const availableOptions = within(availableOptionsList).getAllByRole('option');
      expect(availableOptions[0]).toHaveTextContent('Exists. Checked option.');
    });
  });

  describe('sorting suggestions', () => {
    test('when sorting suggestions, show both sorting types for keyword field', async () => {
      const popover = await mountComponent({
        componentState: {
          field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec,
        },
      });
      const sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      await user.click(sortButton);

      expect(popover.getByTestId('optionsListControl__sortingOptions')).toBeInTheDocument();

      const sortingOptionsDiv = popover.getByTestId('optionsListControl__sortingOptions');
      const optionsText = within(sortingOptionsDiv)
        .getAllByRole('option')
        .map((el) => el.textContent);
      expect(optionsText).toEqual(['By document count. Checked option.', 'Alphabetically']);
    });

    test('sorting popover selects appropriate sorting type on load', async () => {
      const popover = await mountComponent({
        explicitInput: { sort: { by: '_key', direction: 'asc' } },
        componentState: {
          field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec,
        },
      });
      const sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      await user.click(sortButton);

      expect(popover.getByTestId('optionsListControl__sortingOptions')).toBeInTheDocument();

      const sortingOptionsDiv = popover.getByTestId('optionsListControl__sortingOptions');
      const optionsText = within(sortingOptionsDiv)
        .getAllByRole('option')
        .map((el) => el.textContent);
      expect(optionsText).toEqual(['By document count', 'Alphabetically. Checked option.']);

      const ascendingButton = popover.getByTestId('optionsList__sortOrder_asc');
      expect(ascendingButton).toHaveClass('euiButtonGroupButton-isSelected');
      const descendingButton = popover.getByTestId('optionsList__sortOrder_desc');
      expect(descendingButton).not.toHaveClass('euiButtonGroupButton-isSelected');
    });

    test('when sorting suggestions, only show document count sorting for IP fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test IP field', type: 'ip' } as FieldSpec },
      });
      const sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      await user.click(sortButton);

      expect(popover.getByTestId('optionsListControl__sortingOptions')).toBeInTheDocument();

      const sortingOptionsDiv = popover.getByTestId('optionsListControl__sortingOptions');
      const optionsText = within(sortingOptionsDiv)
        .getAllByRole('option')
        .map((el) => el.textContent);
      expect(optionsText).toEqual(['By document count. Checked option.']);
    });

    test('when sorting suggestions, show "By date" sorting option for date fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test date field', type: 'date' } as FieldSpec },
      });
      const sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      await user.click(sortButton);

      expect(popover.getByTestId('optionsListControl__sortingOptions')).toBeInTheDocument();

      const sortingOptionsDiv = popover.getByTestId('optionsListControl__sortingOptions');
      const optionsText = within(sortingOptionsDiv)
        .getAllByRole('option')
        .map((el) => el.textContent);
      expect(optionsText).toEqual(['By document count. Checked option.', 'By date']);
    });

    test('when sorting suggestions, show "Numerically" sorting option for number fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test number field', type: 'number' } as FieldSpec },
      });
      const sortButton = popover.getByTestId('optionsListControl__sortingOptionsButton');
      await user.click(sortButton);

      expect(popover.getByTestId('optionsListControl__sortingOptions')).toBeInTheDocument();

      const sortingOptionsDiv = popover.getByTestId('optionsListControl__sortingOptions');
      const optionsText = within(sortingOptionsDiv)
        .getAllByRole('option')
        .map((el) => el.textContent);
      expect(optionsText).toEqual(['By document count. Checked option.', 'Numerically']);
    });
  });

  describe('allow expensive queries warning', () => {
    test('ensure warning icon does not show up when testAllowExpensiveQueries = true/undefined', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec },
      });
      const warning = popover.queryByTestId('optionsList-allow-expensive-queries-warning');
      expect(warning).toBeNull();
    });

    test('ensure warning icon shows up when testAllowExpensiveQueries = false', async () => {
      pluginServices.getServices().optionsList.getAllowExpensiveQueries = jest.fn(() =>
        Promise.resolve(false)
      );
      const popover = await mountComponent({
        componentState: {
          field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec,
          allowExpensiveQueries: false,
        },
      });
      const warning = popover.getByTestId('optionsList-allow-expensive-queries-warning');
      expect(warning).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('advanced settings', () => {
    const ensureComponentIsHidden = async ({
      explicitInput,
      testSubject,
    }: {
      explicitInput: Partial<OptionsListEmbeddableInput>;
      testSubject: string;
    }) => {
      const popover = await mountComponent({
        explicitInput,
      });
      const test = popover.queryByTestId(testSubject);
      expect(test).toBeNull();
    };

    test('can hide exists option', async () => {
      ensureComponentIsHidden({
        explicitInput: { hideExists: true },
        testSubject: 'optionsList-control-selection-exists',
      });
    });

    test('can hide include/exclude toggle', async () => {
      ensureComponentIsHidden({
        explicitInput: { hideExclude: true },
        testSubject: 'optionsList__includeExcludeButtonGroup',
      });
    });

    test('can hide sorting button', async () => {
      ensureComponentIsHidden({
        explicitInput: { hideSort: true },
        testSubject: 'optionsListControl__sortingOptionsButton',
      });
    });
  });

  describe('field formatter', () => {
    const mockedFormatter = jest.fn().mockImplementation((value: unknown) => `formatted:${value}`);

    beforeAll(() => {
      stubDataView.getFormatterForField = jest.fn().mockReturnValue({
        getConverterFor: () => mockedFormatter,
      });
      pluginServices.getServices().dataViews.get = jest.fn().mockResolvedValue(stubDataView);
    });

    afterEach(() => {
      mockedFormatter.mockClear();
    });

    test('uses field formatter on suggestions', async () => {
      const popover = await mountComponent({
        componentState: {
          field: stubDataView.fields.getByName('bytes')?.toSpec(),
          availableOptions: [
            { value: 1000, docCount: 1 },
            { value: 123456789, docCount: 4 },
          ],
        },
      });

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
      await mountComponent({
        componentState: {
          field: stubDataView.fields.getByName('@timestamp')?.toSpec(),
          availableOptions: [
            { value: 1721283696000, docCount: 1 },
            { value: 1721295533000, docCount: 2 },
          ],
        },
      });
      expect(mockedFormatter).toHaveBeenNthCalledWith(1, 1721283696000);
      expect(mockedFormatter).toHaveBeenNthCalledWith(2, 1721295533000);
    });
  });
});
