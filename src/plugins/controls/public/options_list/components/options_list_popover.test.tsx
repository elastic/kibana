/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { FieldSpec } from '@kbn/data-views-plugin/common';

import { pluginServices } from '../../services';
import { mockOptionsListEmbeddable } from '../../../common/mocks';
import { ControlOutput, OptionsListEmbeddableInput } from '../..';
import { OptionsListComponentState, OptionsListReduxState } from '../types';
import { OptionsListEmbeddableContext } from '../embeddable/options_list_embeddable';
import { OptionsListPopover, OptionsListPopoverProps } from './options_list_popover';

describe('Options list popover', () => {
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

    return mountWithIntl(
      <OptionsListEmbeddableContext.Provider value={optionsListEmbeddable}>
        <OptionsListPopover {...compProps} />
      </OptionsListEmbeddableContext.Provider>
    );
  }

  const clickShowOnlySelections = (popover: ReactWrapper) => {
    const showOnlySelectedButton = findTestSubject(
      popover,
      'optionsList-control-show-only-selected'
    );
    showOnlySelectedButton.simulate('click');
  };

  test('no available options', async () => {
    const popover = await mountComponent({ componentState: { availableOptions: [] } });
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    const noOptionsDiv = findTestSubject(
      availableOptionsDiv,
      'optionsList-control-noSelectionsMessage'
    );
    expect(noOptionsDiv.exists()).toBeTruthy();
  });

  describe('show only selected', () => {
    test('display error message when the show only selected toggle is true but there are no selections', async () => {
      const popover = await mountComponent();
      clickShowOnlySelections(popover);
      const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
      const noSelectionsDiv = findTestSubject(
        availableOptionsDiv,
        'optionsList-control-selectionsEmptyMessage'
      );
      expect(noSelectionsDiv.exists()).toBeTruthy();
    });

    test('show only selected options', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { selectedOptions: selections },
      });
      clickShowOnlySelections(popover);
      const availableOptions = popover.find(
        '[data-test-subj="optionsList-control-available-options"] ul'
      );
      availableOptions.children().forEach((child, i) => {
        expect(child.text()).toBe(`${selections[i]}. Checked option.`);
      });
    });

    test('disable search and sort when show only selected toggle is true', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { selectedOptions: selections },
        componentState: { field: { type: 'string' } as any as FieldSpec },
      });
      let searchBox = findTestSubject(popover, 'optionsList-control-search-input');
      let sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      expect(searchBox.prop('disabled')).toBeFalsy();
      expect(sortButton.prop('disabled')).toBeFalsy();

      clickShowOnlySelections(popover);
      searchBox = findTestSubject(popover, 'optionsList-control-search-input');
      sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      expect(searchBox.prop('disabled')).toBe(true);
      expect(sortButton.prop('disabled')).toBe(true);
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
      const validSelection = findTestSubject(popover, 'optionsList-control-selection-bark');
      expect(validSelection.find('.euiSelectableListItem__text').text()).toEqual(
        'bark. Checked option.'
      );
      expect(
        validSelection.find('div[data-test-subj="optionsList-document-count-badge"]').text().trim()
      ).toEqual('75');
      const title = findTestSubject(popover, 'optionList__ignoredSelectionLabel').text();
      expect(title).toEqual('Ignored selection');
      const invalidSelection = findTestSubject(
        popover,
        'optionsList-control-ignored-selection-woof'
      );
      expect(invalidSelection.find('.euiSelectableListItem__text').text()).toEqual(
        'woof. Checked option.'
      );
      expect(invalidSelection.hasClass('optionsList__selectionInvalid')).toBe(true);
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
      const title = findTestSubject(popover, 'optionList__ignoredSelectionLabel').text();
      expect(title).toEqual('Ignored selections');
    });
  });

  describe('include/exclude toggle', () => {
    test('should default to exclude = false', async () => {
      const popover = await mountComponent();
      const includeButton = findTestSubject(popover, 'optionsList__includeResults');
      const excludeButton = findTestSubject(popover, 'optionsList__excludeResults');
      expect(includeButton.prop('aria-pressed')).toBe(true);
      expect(excludeButton.prop('aria-pressed')).toBe(false);
    });

    test('if exclude = true, select appropriate button in button group', async () => {
      const popover = await mountComponent({
        explicitInput: { exclude: true },
      });
      const includeButton = findTestSubject(popover, 'optionsList__includeResults');
      const excludeButton = findTestSubject(popover, 'optionsList__excludeResults');
      expect(includeButton.prop('aria-pressed')).toBe(false);
      expect(excludeButton.prop('aria-pressed')).toBe(true);
    });
  });

  describe('"Exists" option', () => {
    test('clicking another option unselects "Exists"', async () => {
      const popover = await mountComponent({
        explicitInput: { existsSelected: true },
      });
      const woofOption = findTestSubject(popover, 'optionsList-control-selection-woof');
      woofOption.simulate('click');

      const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
      availableOptionsDiv.children().forEach((child, i) => {
        if (child.text() === 'woof') expect(child.prop('aria-pressed')).toBe(true);
        else expect(child.prop('aria-pressed')).toBeFalsy();
      });
    });

    test('clicking "Exists" unselects all other selections', async () => {
      const selections = ['woof', 'bark'];
      const popover = await mountComponent({
        explicitInput: { existsSelected: false, selectedOptions: selections },
      });
      const existsOption = findTestSubject(popover, 'optionsList-control-selection-exists');
      let availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
      availableOptionsDiv.children().forEach((child, i) => {
        if (selections.includes(child.text())) expect(child.prop('aria-pressed')).toBe(true);
        else expect(child.prop('aria-pressed')).toBeFalsy();
      });

      existsOption.simulate('click');
      availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
      availableOptionsDiv.children().forEach((child, i) => {
        if (child.text() === 'Exists (*)') expect(child.prop('aria-pressed')).toBe(true);
        else expect(child.prop('aria-pressed')).toBeFalsy();
      });
    });

    test('if existsSelected = false and no suggestions, then "Exists" does not show up', async () => {
      const popover = await mountComponent({
        componentState: { availableOptions: [] },
        explicitInput: { existsSelected: false },
      });
      const existsOption = findTestSubject(popover, 'optionsList-control-selection-exists');
      expect(existsOption.exists()).toBeFalsy();
    });

    test('if existsSelected = true, "Exists" is the only option when "Show only selected options" is toggled', async () => {
      const popover = await mountComponent({
        explicitInput: { existsSelected: true },
      });
      clickShowOnlySelections(popover);
      const availableOptions = popover.find(
        '[data-test-subj="optionsList-control-available-options"] ul'
      );
      expect(availableOptions.text()).toBe('Exists. Checked option.');
    });
  });

  describe('sorting suggestions', () => {
    test('when sorting suggestions, show both sorting types for keyword field', async () => {
      const popover = await mountComponent({
        componentState: {
          field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec,
        },
      });
      const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      sortButton.simulate('click');

      const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
      const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
      expect(optionsText).toEqual(['By document count. Checked option.', 'Alphabetically']);
    });

    test('sorting popover selects appropriate sorting type on load', async () => {
      const popover = await mountComponent({
        explicitInput: { sort: { by: '_key', direction: 'asc' } },
        componentState: {
          field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec,
        },
      });
      const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      sortButton.simulate('click');

      const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
      const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
      expect(optionsText).toEqual(['By document count', 'Alphabetically. Checked option.']);

      const ascendingButton = findTestSubject(popover, 'optionsList__sortOrder_asc').instance();
      expect(ascendingButton).toHaveClass('euiButtonGroupButton-isSelected');
      const descendingButton = findTestSubject(popover, 'optionsList__sortOrder_desc').instance();
      expect(descendingButton).not.toHaveClass('euiButtonGroupButton-isSelected');
    });

    test('when sorting suggestions, only show document count sorting for IP fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test IP field', type: 'ip' } as FieldSpec },
      });
      const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      sortButton.simulate('click');

      const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
      const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
      expect(optionsText).toEqual(['By document count. Checked option.']);
    });

    test('when sorting suggestions, show "By date" sorting option for date fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test date field', type: 'date' } as FieldSpec },
      });
      const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      sortButton.simulate('click');

      const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
      const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
      expect(optionsText).toEqual(['By document count. Checked option.', 'By date']);
    });

    test('when sorting suggestions, show "Numerically" sorting option for number fields', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test number field', type: 'number' } as FieldSpec },
      });
      const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
      sortButton.simulate('click');

      const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
      const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
      expect(optionsText).toEqual(['By document count. Checked option.', 'Numerically']);
    });
  });

  describe('allow expensive queries warning', () => {
    test('ensure warning icon does not show up when testAllowExpensiveQueries = true/undefined', async () => {
      const popover = await mountComponent({
        componentState: { field: { name: 'Test keyword field', type: 'keyword' } as FieldSpec },
      });
      const warning = findTestSubject(popover, 'optionsList-allow-expensive-queries-warning');
      expect(warning).toEqual({});
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
      const warning = findTestSubject(popover, 'optionsList-allow-expensive-queries-warning');
      expect(warning.getDOMNode()).toBeInstanceOf(HTMLDivElement);
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
      const test = findTestSubject(popover, testSubject);
      expect(test.exists()).toBeFalsy();
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
});
