/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import {
  TabbedTableListView,
  TableListTabParentProps,
  TableListTab,
} from './tabbed_table_list_view';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiTab } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

// Mock the necessary props for the component
const title = 'Test Title';
const description = 'Test Description';
const headingId = 'test-heading-id';
const children = <div>Test Children</div>;
const tabs: TableListTab[] = [
  {
    title: 'Tab 1',
    id: 'tab-1',
    getTableList: async (props: TableListTabParentProps) => <div>Test Table List 1</div>,
  },
  {
    title: 'Tab 2',
    id: 'tab-2',
    getTableList: async (props: TableListTabParentProps) => <div>Test Table List 2</div>,
  },
];

describe('TabbedTableListView', () => {
  it('should render without errors', () => {
    const wrapper = shallow(
      <TabbedTableListView
        title={title}
        description={description}
        headingId={headingId}
        children={children}
        tabs={tabs}
        activeTabId={'tab-1'}
        changeActiveTab={() => {}}
      />
    );
    expect(wrapper.exists()).toBe(true);
  });

  it('should render the correct title and description', () => {
    const wrapper = shallow(
      <TabbedTableListView
        title={title}
        description={description}
        headingId={headingId}
        children={children}
        tabs={tabs}
        activeTabId={'tab-1'}
        changeActiveTab={() => {}}
      />
    );
    expect(wrapper.find(KibanaPageTemplate.Header).prop('pageTitle')).toMatchInlineSnapshot(`
      <span
        id="test-heading-id"
      >
        Test Title
      </span>
    `);
    expect(wrapper.find(KibanaPageTemplate.Header).prop('description')).toContain(description);
  });

  it('should render the correct number of tabs', () => {
    const wrapper = shallow(
      <TabbedTableListView
        title={title}
        description={description}
        headingId={headingId}
        children={children}
        tabs={tabs}
        activeTabId={'tab-1'}
        changeActiveTab={() => {}}
      />
    );
    expect(wrapper.find(EuiTab).length).toEqual(tabs.length);
  });

  it('should switch tabs when a tab is clicked', () => {
    const changeActiveTab = jest.fn();

    const wrapper = shallow(
      <TabbedTableListView
        title={title}
        description={description}
        headingId={headingId}
        children={children}
        tabs={tabs}
        activeTabId={'tab-1'}
        changeActiveTab={changeActiveTab}
      />
    );

    const getTab = (index: number) => wrapper.find(EuiTab).at(index);

    expect(getTab(0).prop('isSelected')).toBeTruthy();
    expect(getTab(1).prop('isSelected')).toBeFalsy();

    act(() => {
      getTab(1).simulate('click');
    });

    expect(changeActiveTab).toHaveBeenCalledWith('tab-2');

    act(() => {
      wrapper.setProps({
        activeTabId: 'tab-2',
      });
    });

    expect(getTab(0).prop('isSelected')).toBeFalsy();
    expect(getTab(1).prop('isSelected')).toBeTruthy();
  });
});
