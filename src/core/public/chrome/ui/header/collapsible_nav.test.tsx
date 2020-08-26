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
import { BehaviorSubject } from 'rxjs';
import sinon from 'sinon';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { ChromeNavLink, DEFAULT_APP_CATEGORIES } from '../../..';
import { httpServiceMock } from '../../../http/http_service.mock';
import { ChromeRecentlyAccessedHistoryItem } from '../../recently_accessed';
import { CollapsibleNav } from './collapsible_nav';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const { kibana, observability, security, management } = DEFAULT_APP_CATEGORIES;

function mockLink({ title = 'discover', category }: Partial<ChromeNavLink>) {
  return {
    title,
    category,
    id: title,
    href: title,
    baseUrl: '/',
    legacy: false,
    isActive: true,
    'data-test-subj': title,
  };
}

function mockRecentNavLink({ label = 'recent' }: Partial<ChromeRecentlyAccessedHistoryItem>) {
  return {
    label,
    link: label,
    id: label,
  };
}

function mockProps() {
  return {
    appId$: new BehaviorSubject('test'),
    basePath: httpServiceMock.createSetupContract({ basePath: '/test' }).basePath,
    id: 'collapsibe-nav',
    isLocked: false,
    isOpen: false,
    homeHref: '/',
    legacyMode: false,
    navLinks$: new BehaviorSubject([]),
    recentlyAccessed$: new BehaviorSubject([]),
    storage: new StubBrowserStorage(),
    onIsLockedUpdate: () => {},
    closeNav: () => {},
    navigateToApp: () => Promise.resolve(),
    customNavLink$: new BehaviorSubject(undefined),
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
      mockLink({ title: 'discover', category: kibana }),
      mockLink({ title: 'siem', category: security }),
      mockLink({ title: 'metrics', category: observability }),
      mockLink({ title: 'monitoring', category: management }),
      mockLink({ title: 'visualize', category: kibana }),
      mockLink({ title: 'dashboard', category: kibana }),
      mockLink({ title: 'canvas' }), // links should be able to be rendered top level as well
      mockLink({ title: 'logs', category: observability }),
    ];
    const recentNavLinks = [
      mockRecentNavLink({ label: 'recent 1' }),
      mockRecentNavLink({ label: 'recent 2' }),
    ];
    const customNavLink = mockLink({ title: 'Custom link' });
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isOpen={true}
        navLinks$={new BehaviorSubject(navLinks)}
        recentlyAccessed$={new BehaviorSubject(recentNavLinks)}
        customNavLink$={new BehaviorSubject(customNavLink)}
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
        navLinks$={new BehaviorSubject(navLinks)}
        recentlyAccessed$={new BehaviorSubject(recentNavLinks)}
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
    const onClose = sinon.spy();
    const navLinks = [mockLink({ category: kibana }), mockLink({ title: 'categoryless' })];
    const recentNavLinks = [mockRecentNavLink({})];
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isOpen={true}
        navLinks$={new BehaviorSubject(navLinks)}
        recentlyAccessed$={new BehaviorSubject(recentNavLinks)}
      />
    );
    component.setProps({
      closeNav: () => {
        component.setProps({ isOpen: false });
        onClose();
      },
    });

    component.find('[data-test-subj="collapsibleNavGroup-recentlyViewed"] a').simulate('click');
    expect(onClose.callCount).toEqual(1);
    expectNavIsClosed(component);
    component.setProps({ isOpen: true });
    component.find('[data-test-subj="collapsibleNavGroup-kibana"] a').simulate('click');
    expect(onClose.callCount).toEqual(2);
    expectNavIsClosed(component);
    component.setProps({ isOpen: true });
    component.find('[data-test-subj="collapsibleNavGroup-noCategory"] a').simulate('click');
    expect(onClose.callCount).toEqual(3);
    expectNavIsClosed(component);
  });
});
