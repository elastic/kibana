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

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import { CollapsibleNav } from './collapsible_nav';
import { AppCategory } from '../../../../types';
import { DEFAULT_APP_CATEGORIES } from '../../..';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const { kibana, observability, security, management } = DEFAULT_APP_CATEGORIES;

function mockLink(label: string, category?: AppCategory) {
  return {
    key: label,
    label,
    href: label,
    isActive: true,
    onClick: () => {},
    category,
    'data-test-subj': label,
  };
}

function mockRecentNavLink(label: string) {
  return {
    href: label,
    label,
    title: label,
    'aria-label': label,
  };
}

function mockProps() {
  return {
    id: 'collapsible-nav',
    homeHref: '/',
    isLocked: false,
    isOpen: false,
    navLinks: [],
    recentNavLinks: [],
    storage: new StubBrowserStorage(),
    onIsOpenUpdate: () => {},
    onIsLockedUpdate: () => {},
    navigateToApp: () => {},
  };
}

describe('CollapsibleNav', () => {
  // this test is mostly an "EUI works as expected" sanity check
  it('renders the default nav', () => {
    const onLock = sinon.spy();
    const component = mount(<CollapsibleNav {...mockProps()} onIsLockedUpdate={onLock} />);
    expect(component).toMatchSnapshot();

    component.setProps({ isOpen: true });
    expect(component).toMatchSnapshot();

    component.setProps({ isLocked: true });
    expect(component).toMatchSnapshot();

    // limit the find to buttons because jest also renders data-test-subj on a JSX wrapper element
    component.find('button[data-test-subj="collapsible-nav-lock"]').simulate('click');
    expect(onLock.callCount).toEqual(1);
  });

  it('renders links grouped by category', () => {
    // just a test of category functionality, categories are not accurate
    const navLinks = [
      mockLink('discover', kibana),
      mockLink('siem', security),
      mockLink('metrics', observability),
      mockLink('monitoring', management),
      mockLink('visualize', kibana),
      mockLink('dashboard', kibana),
      mockLink('canvas'), // links should be able to be rendered top level as well
      mockLink('logs', observability),
    ];
    const recentNavLinks = [mockRecentNavLink('recent 1'), mockRecentNavLink('recent 2')];
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isOpen={true}
        navLinks={navLinks}
        recentNavLinks={recentNavLinks}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('remembers collapsible section state', () => {
    function expectNavLinksCount(component: ReactWrapper, count: number) {
      expect(
        component.find('.euiAccordion-isOpen a[data-test-subj="collapsibleNavAppLink"]').length
      ).toEqual(count);
    }

    const navLinks = [
      mockLink('discover', kibana),
      mockLink('siem', security),
      mockLink('metrics', observability),
      mockLink('monitoring', management),
      mockLink('visualize', kibana),
      mockLink('dashboard', kibana),
      mockLink('logs', observability),
    ];
    const component = mount(<CollapsibleNav {...mockProps()} isOpen={true} navLinks={navLinks} />);
    expectNavLinksCount(component, 7);
    component.find('[data-test-subj="collapsibleNavGroup-kibana"] button').simulate('click');
    expectNavLinksCount(component, 4);
    component.setProps({ isOpen: false });
    expectNavLinksCount(component, 0); // double check the nav closed
    component.setProps({ isOpen: true });
    expectNavLinksCount(component, 4);
  });
});
