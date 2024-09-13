/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ReactWrapper, mount, shallow } from 'enzyme';
import {
  TabbedTableListView,
  TableListTabParentProps,
  TableListTab,
} from './tabbed_table_list_view';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageTemplate } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

// Mock the necessary props for the component
const title = 'Test Title';
const description = 'Test Description';
const headingId = 'test-heading-id';
const children = <div>Test Children</div>;

const tableList1 = 'Test Table List 1';
const tableList2 = 'Test Table List 2';

const tabs: TableListTab[] = [
  {
    title: 'Tab 1',
    id: 'tab-1',
    getTableList: async (props: TableListTabParentProps) => <div>{tableList1}</div>,
  },
  {
    title: 'Tab 2',
    id: 'tab-2',
    getTableList: async (props: TableListTabParentProps) => <div>{tableList2}</div>,
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

    expect(wrapper.find(EuiPageTemplate.Header).prop('tabs')).toHaveLength(2);
  });

  it('should switch tabs when props change', async () => {
    const changeActiveTab = jest.fn();

    let wrapper: ReactWrapper | undefined;
    await act(async () => {
      wrapper = mount(
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
    });

    if (!wrapper) {
      throw new Error("enzyme wrapper didn't initialize");
    }

    expect(wrapper.find(EuiPageTemplate.Section).text()).toContain(tableList1);

    await act(async () => {
      wrapper?.setProps({
        activeTabId: 'tab-2',
      });
    });

    expect(wrapper.find(EuiPageTemplate.Section).text()).toContain(tableList2);
  });
});
