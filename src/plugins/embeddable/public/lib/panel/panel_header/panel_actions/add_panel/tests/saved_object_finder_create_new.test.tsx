/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { SavedObjectFinderCreateNew } from '../saved_object_finder_create_new';
import { shallow } from 'enzyme';
import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

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
        <EuiContextMenuItem
          key={i + 1}
          data-test-subj={`item${i + 1}`}
          onClick={onClick}
        >{`item${i + 1}`}</EuiContextMenuItem>
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
        <EuiContextMenuItem
          key={i + 1}
          data-test-subj={`item${i + 1}`}
          onClick={onClick}
        >{`item${i + 1}`}</EuiContextMenuItem>
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
