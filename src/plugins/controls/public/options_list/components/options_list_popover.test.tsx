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
import { ControlOutput, OptionsListEmbeddableInput } from '../..';
import { mockOptionsListReduxEmbeddableTools } from '../../../common/mocks';

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
    const popover = await mountComponent({ componentState: { availableOptions: [] } });
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
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.children().at(0).text()).toBe('Exists');
  });
});
