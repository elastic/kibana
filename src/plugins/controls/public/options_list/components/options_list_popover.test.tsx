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
import { EmbeddableReduxContext } from '@kbn/presentation-util-plugin/public/redux_embeddables/use_redux_embeddable_context';

import { OptionsListPopover, OptionsListPopoverProps } from './options_list_popover';
import {
  OptionsListComponentState,
  OptionsListEmbeddableInput,
  OptionsListReduxState,
} from '../types';
import { ControlOutput } from '../..';
import { mockOptionsListContext } from '../../../common/mocks';

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

  function mountComponent(options?: Partial<MountOptions>) {
    const compProps = { ...defaultProps, ...(options?.popoverProps ?? {}) };
    const context = mockOptionsListContext({
      componentState: options?.componentState ?? {},
      explicitInput: options?.explicitInput ?? {},
      output: options?.output ?? {},
    } as Partial<OptionsListReduxState>);

    return mountWithIntl(
      <EmbeddableReduxContext.Provider value={context}>
        <OptionsListPopover {...compProps} />
      </EmbeddableReduxContext.Provider>
    );
  }

  const clickShowOnlySelections = (popover: ReactWrapper) => {
    const showOnlySelectedButton = findTestSubject(
      popover,
      'optionsList-control-show-only-selected'
    );
    showOnlySelectedButton.simulate('click');
  };

  test('available options list width responds to container size', () => {
    let popover = mountComponent({ popoverProps: { width: 301 } });
    let availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.getDOMNode().getAttribute('style')).toBe('width: 301px;');

    // the div cannot be smaller than 301 pixels wide
    popover = mountComponent({ popoverProps: { width: 300 } });
    availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    expect(availableOptionsDiv.getDOMNode().getAttribute('style')).toBe(null);
  });

  test('no available options', () => {
    const popover = mountComponent({ componentState: { availableOptions: [] } });
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    const noOptionsDiv = findTestSubject(
      availableOptionsDiv,
      'optionsList-control-noSelectionsMessage'
    );
    expect(noOptionsDiv.exists()).toBeTruthy();
  });

  test('display error message when the show only selected toggle is true but there are no selections', () => {
    const popover = mountComponent();
    clickShowOnlySelections(popover);
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    const noSelectionsDiv = findTestSubject(
      availableOptionsDiv,
      'optionsList-control-selectionsEmptyMessage'
    );
    expect(noSelectionsDiv.exists()).toBeTruthy();
  });

  test('show only selected options', () => {
    const selections = ['woof', 'bark'];
    const popover = mountComponent({
      explicitInput: { selectedOptions: selections },
    });
    clickShowOnlySelections(popover);
    const availableOptionsDiv = findTestSubject(popover, 'optionsList-control-available-options');
    availableOptionsDiv.children().forEach((child, i) => {
      expect(child.text()).toBe(selections[i]);
    });
  });
});
