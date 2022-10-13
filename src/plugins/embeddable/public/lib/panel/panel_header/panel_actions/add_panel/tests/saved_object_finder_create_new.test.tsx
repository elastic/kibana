/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { SavedObjectFinderCreateNew } from '../saved_object_finder_create_new';
import { shallow } from 'enzyme';
import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('SavedObjectFinderCreateNew', () => {
  test('renders correctly with no items', () => {
    const wrapper = shallow(<SavedObjectFinderCreateNew menuItems={[]} />);
    expect(wrapper.find(EuiPopover).length).toEqual(1);
    const menuPanel = wrapper.find(EuiContextMenuPanel);
    expect(menuPanel.length).toEqual(1);
    const panelItems = menuPanel.prop('items');
    if (panelItems) {
      expect(panelItems.length).toEqual(0);
    } else {
      fail('Expect paneltems to be defined');
    }
  });

  test('renders correctly with items', () => {
    const items = [];
    const onClick = jest.fn();
    for (let i = 0; i < 3; i++) {
      items.push(
        <EuiContextMenuItem key={i + 1} data-test-subj={`item${i + 1}`} onClick={onClick}>{`item${
          i + 1
        }`}</EuiContextMenuItem>
      );
    }

    const wrapper = shallow(<SavedObjectFinderCreateNew menuItems={items} />);
    expect(wrapper.find(EuiPopover).length).toEqual(1);
    const menuPanel = wrapper.find(EuiContextMenuPanel);
    expect(menuPanel.length).toEqual(1);
    const paneltems = menuPanel.prop('items');
    if (paneltems) {
      expect(paneltems.length).toEqual(3);
      expect(paneltems[0].key).toEqual('1');
      expect(paneltems[1].key).toEqual('2');
      expect(paneltems[2].key).toEqual('3');
    } else {
      fail('Expect paneltems to be defined');
    }
  });

  test('clicking the button opens/closes the popover', () => {
    const items = [];
    const onClick = jest.fn();
    for (let i = 0; i < 3; i++) {
      items.push(
        <EuiContextMenuItem key={i + 1} data-test-subj={`item${i + 1}`} onClick={onClick}>{`item${
          i + 1
        }`}</EuiContextMenuItem>
      );
    }

    const component = mountWithIntl(<SavedObjectFinderCreateNew menuItems={items} />);
    let popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(false);
    const button = component.find(EuiButton);
    button.simulate('click');
    popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(true);
    button.simulate('click');
    popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(false);
  });
});
