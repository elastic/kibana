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
import { DEFAULT_APP_CATEGORIES } from '../../..';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { NavLink, RecentNavLink } from './nav_link';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const { kibana, observability, security, management } = DEFAULT_APP_CATEGORIES;

function mockLink({ label = 'discover', category, onClick }: Partial<NavLink>) {
  return {
    key: label,
    label,
    href: label,
    isActive: true,
    onClick: onClick || (() => {}),
    category,
    'data-test-subj': label,
  };
}

function mockRecentNavLink({ label = 'recent', onClick }: Partial<RecentNavLink>) {
  return {
    href: label,
    label,
    title: label,
    'aria-label': label,
    onClick,
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
  };
}

function expectShownNavLinksCount(component: ReactWrapper, count: number) {
  expect(
    component.find('.euiAccordion-isOpen a[data-test-subj^="collapsibleNavAppLink"]').length
  ).toEqual(count);
}

function expectNavIsClosed(component: ReactWrapper) {
  expectShownNavLinksCount(component, 0);
}

function clickGroup(component: ReactWrapper, group: string) {
  component.find(`[data-test-subj="collapsibleNavGroup-${group}"] button`).simulate('click');
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
      mockLink({ label: 'discover', category: kibana }),
      mockLink({ label: 'siem', category: security }),
      mockLink({ label: 'metrics', category: observability }),
      mockLink({ label: 'monitoring', category: management }),
      mockLink({ label: 'visualize', category: kibana }),
      mockLink({ label: 'dashboard', category: kibana }),
      mockLink({ label: 'canvas' }), // links should be able to be rendered top level as well
      mockLink({ label: 'logs', category: observability }),
    ];
    const recentNavLinks = [
      mockRecentNavLink({ label: 'recent 1' }),
      mockRecentNavLink({ label: 'recent 2' }),
    ];
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
    const navLinks = [mockLink({ category: kibana }), mockLink({ category: observability })];
    const recentNavLinks = [mockRecentNavLink({})];
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isOpen={true}
        navLinks={navLinks}
        recentNavLinks={recentNavLinks}
      />
    );
    expectShownNavLinksCount(component, 3);
    clickGroup(component, 'kibana');
    clickGroup(component, 'recentlyViewed');
    expectShownNavLinksCount(component, 1);
    component.setProps({ isOpen: false });
    expectNavIsClosed(component);
    component.setProps({ isOpen: true });
    expectShownNavLinksCount(component, 1);
  });

  it('closes the nav after clicking a link', () => {
    const onClick = sinon.spy();
    const onIsOpenUpdate = sinon.spy();
    const navLinks = [mockLink({ category: kibana, onClick })];
    const recentNavLinks = [mockRecentNavLink({ onClick })];
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isOpen={true}
        navLinks={navLinks}
        recentNavLinks={recentNavLinks}
      />
    );
    component.setProps({
      onIsOpenUpdate: (isOpen: boolean) => {
        component.setProps({ isOpen });
        onIsOpenUpdate();
      },
    });

    component.find('[data-test-subj="collapsibleNavGroup-recentlyViewed"] a').simulate('click');
    expect(onClick.callCount).toEqual(1);
    expect(onIsOpenUpdate.callCount).toEqual(1);
    expectNavIsClosed(component);
    component.setProps({ isOpen: true });
    component.find('[data-test-subj="collapsibleNavGroup-kibana"] a').simulate('click');
    expect(onClick.callCount).toEqual(2);
    expect(onIsOpenUpdate.callCount).toEqual(2);
  });
});
