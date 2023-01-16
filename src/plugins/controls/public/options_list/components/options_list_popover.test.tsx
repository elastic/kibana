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

import { OptionsListPopover, OptionsListPopoverProps } from './options_list_popover';
import { OptionsListComponentState, OptionsListReduxState } from '../types';
import { mockOptionsListReduxEmbeddableTools } from '../../../common/mocks';
import { OptionsListField } from '../../../common/options_list/types';
import { ControlOutput, OptionsListEmbeddableInput } from '../..';

describe('Options list popover', () => {
  const defaultProps = {
    width: 500,
    updateSearchString: jest.fn(),
  };

  interface MountOptions {
    componentState: Partial<OptionsListComponentState>;
    explicitInput: Partial<OptionsListEmbeddableInput>;
    output: Partial<ControlOutput>;
    popoverProps: Partial<OptionsListPopoverProps>;
  }

  async function mountComponent(options?: Partial<MountOptions>) {
    const compProps = { ...defaultProps, ...(options?.popoverProps ?? {}) };
    const mockReduxEmbeddableTools = await mockOptionsListReduxEmbeddableTools({
      componentState: options?.componentState ?? {},
      explicitInput: options?.explicitInput ?? {},
      output: options?.output ?? {},
    } as Partial<OptionsListReduxState>);

    return mountWithIntl(
      <mockReduxEmbeddableTools.Wrapper>
        <OptionsListPopover {...compProps} />
      </mockReduxEmbeddableTools.Wrapper>
    );
  }

  const clickShowOnlySelections = (popover: ReactWrapper) => {
    const showOnlySelectedButton = findTestSubject(
      popover,
      'optionsList-control-show-only-selected'
    );
    showOnlySelectedButton.simulate('click');
  };

  test('available options list width responds to container size', async () => {
    let popover = await mountComponent({ popoverProps: { width: 301 } });
    let availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.getDOMNode().getAttribute('style')).toBe('width: 301px;');

    // the div cannot be smaller than 301 pixels wide
    popover = await mountComponent({ popoverProps: { width: 300 } });
    availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.getDOMNode().getAttribute('style')).toBe(null);
  });

  test('no available options', async () => {
    const popover = await mountComponent({ componentState: { availableOptions: {} } });
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    const noOptionsDiv = findTestSubject(
      availableOptionsDiv,
      'optionsList-control-noSelectionsMessage'
    );
    expect(noOptionsDiv.exists()).toBeTruthy();
  });

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
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    availableOptionsDiv
      .childAt(0)
      .children()
      .forEach((child, i) => {
        expect(child.text()).toBe(selections[i]);
      });
  });

  test('disable search and sort when show only selected toggle is true', async () => {
    const selections = ['woof', 'bark'];
    const popover = await mountComponent({
      explicitInput: { selectedOptions: selections },
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

  test('test single invalid selection', async () => {
    const popover = await mountComponent({
      explicitInput: {
        selectedOptions: ['bark', 'woof'],
      },
      componentState: {
        availableOptions: {
          bark: { doc_count: 75 },
        },
        validSelections: ['bark'],
        invalidSelections: ['woof'],
      },
    });
    const validSelection = findTestSubject(popover, 'optionsList-control-selection-bark');
    expect(validSelection.text()).toEqual('bark75');
    const title = findTestSubject(popover, 'optionList__ignoredSelectionLabel').text();
    expect(title).toEqual('Ignored selection');
    const invalidSelection = findTestSubject(popover, 'optionsList-control-ignored-selection-woof');
    expect(invalidSelection.text()).toEqual('woof');
    expect(invalidSelection.hasClass('optionsList__selectionInvalid')).toBe(true);
  });

  test('test title when multiple invalid selections', async () => {
    const popover = await mountComponent({
      explicitInput: { selectedOptions: ['bark', 'woof', 'meow'] },
      componentState: {
        availableOptions: {
          bark: { doc_count: 75 },
        },
        validSelections: ['bark'],
        invalidSelections: ['woof', 'meow'],
      },
    });
    const title = findTestSubject(popover, 'optionList__ignoredSelectionLabel').text();
    expect(title).toEqual('Ignored selections');
  });

  test('should default to exclude = false', async () => {
    const popover = await mountComponent();
    const includeButton = findTestSubject(popover, 'optionsList__includeResults');
    const excludeButton = findTestSubject(popover, 'optionsList__excludeResults');
    expect(includeButton.prop('checked')).toBe(true);
    expect(excludeButton.prop('checked')).toBeFalsy();
  });

  test('if exclude = true, select appropriate button in button group', async () => {
    const popover = await mountComponent({
      explicitInput: { exclude: true },
    });
    const includeButton = findTestSubject(popover, 'optionsList__includeResults');
    const excludeButton = findTestSubject(popover, 'optionsList__excludeResults');
    expect(includeButton.prop('checked')).toBeFalsy();
    expect(excludeButton.prop('checked')).toBe(true);
  });

  test('clicking another option unselects "Exists"', async () => {
    const popover = await mountComponent({
      explicitInput: { existsSelected: true },
    });
    const woofOption = findTestSubject(popover, 'optionsList-control-selection-woof');
    woofOption.simulate('click');

    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    availableOptionsDiv.children().forEach((child, i) => {
      if (child.text() === 'woof') expect(child.prop('checked')).toBe('on');
      else expect(child.prop('checked')).toBeFalsy();
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
      if (selections.includes(child.text())) expect(child.prop('checked')).toBe('on');
      else expect(child.prop('checked')).toBeFalsy();
    });

    existsOption.simulate('click');
    availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    availableOptionsDiv.children().forEach((child, i) => {
      if (child.text() === 'Exists (*)') expect(child.prop('checked')).toBe('on');
      else expect(child.prop('checked')).toBeFalsy();
    });
  });

  test('if existsSelected = false and no suggestions, then "Exists" does not show up', async () => {
    const popover = await mountComponent({
      componentState: { availableOptions: {} },
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
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.children().at(0).text()).toBe('Exists');
  });

  test('when sorting suggestions, show both sorting types for keyword field', async () => {
    const popover = await mountComponent({
      componentState: {
        field: { name: 'Test keyword field', type: 'keyword' } as OptionsListField,
      },
    });
    const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
    sortButton.simulate('click');

    const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
    const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
    expect(optionsText).toEqual(['By document count - Checked option.', 'Alphabetically']);
  });

  test('sorting popover selects appropriate sorting type on load', async () => {
    const popover = await mountComponent({
      explicitInput: { sort: { by: '_key', direction: 'asc' } },
      componentState: {
        field: { name: 'Test keyword field', type: 'keyword' } as OptionsListField,
      },
    });
    const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
    sortButton.simulate('click');

    const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
    const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
    expect(optionsText).toEqual(['By document count', 'Alphabetically - Checked option.']);

    const ascendingButton = findTestSubject(popover, 'optionsList__sortOrder_asc').instance();
    expect(ascendingButton).toHaveClass('euiButtonGroupButton-isSelected');
    const descendingButton = findTestSubject(popover, 'optionsList__sortOrder_desc').instance();
    expect(descendingButton).not.toHaveClass('euiButtonGroupButton-isSelected');
  });

  test('when sorting suggestions, only show document count sorting for IP fields', async () => {
    const popover = await mountComponent({
      componentState: { field: { name: 'Test IP field', type: 'ip' } as OptionsListField },
    });
    const sortButton = findTestSubject(popover, 'optionsListControl__sortingOptionsButton');
    sortButton.simulate('click');

    const sortingOptionsDiv = findTestSubject(popover, 'optionsListControl__sortingOptions');
    const optionsText = sortingOptionsDiv.find('ul li').map((element) => element.text().trim());
    expect(optionsText).toEqual(['By document count - Checked option.']);
  });

  describe('Test advanced settings', () => {
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
