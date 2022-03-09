/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import sinon from 'sinon';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { ChromeNavLink, DEFAULT_APP_CATEGORIES } from '../../..';
import { httpServiceMock } from '../../../http/http_service.mock';
import { ChromeRecentlyAccessedHistoryItem } from '../../recently_accessed';
import { CollapsibleNav } from './collapsible_nav';

const { kibana, observability, security, management } = DEFAULT_APP_CATEGORIES;

function mockLink({ title = 'discover', category }: Partial<ChromeNavLink>) {
  return {
    title,
    category,
    id: title,
    href: title,
    baseUrl: '/',
    url: '/',
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
    isNavOpen: false,
    homeHref: '/',
    url: '/',
    navLinks$: new BehaviorSubject([]),
    recentlyAccessed$: new BehaviorSubject([]),
    storage: new StubBrowserStorage(),
    onIsLockedUpdate: () => {},
    closeNav: () => {},
    navigateToApp: () => Promise.resolve(),
    navigateToUrl: () => Promise.resolve(),
    customNavLink$: new BehaviorSubject(undefined),
    button: <button />,
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
  component
    .find(`[data-test-subj="collapsibleNavGroup-${group}"] button`)
    .first()
    .simulate('click');
}

describe('CollapsibleNav', () => {
  // this test is mostly an "EUI works as expected" sanity check
  it('renders the default nav', () => {
    const component = mount(<CollapsibleNav {...mockProps()} />);
    expect(component).toMatchSnapshot();

    component.setProps({ isOpen: true });
    expect(component).toMatchSnapshot();
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
        isNavOpen={true}
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
        isNavOpen={true}
        navLinks$={new BehaviorSubject(navLinks)}
        recentlyAccessed$={new BehaviorSubject(recentNavLinks)}
      />
    );
    expectShownNavLinksCount(component, 3);
    clickGroup(component, 'kibana');
    clickGroup(component, 'recentlyViewed');
    expectShownNavLinksCount(component, 1);
    component.setProps({ isNavOpen: false });
    expectNavIsClosed(component);
    component.setProps({ isNavOpen: true });
    expectShownNavLinksCount(component, 1);
  });

  it('closes the nav after clicking a link', () => {
    const onClose = sinon.spy();
    const navLinks = [mockLink({ category: kibana }), mockLink({ title: 'categoryless' })];
    const recentNavLinks = [mockRecentNavLink({})];
    const component = mount(
      <CollapsibleNav
        {...mockProps()}
        isNavOpen={true}
        navLinks$={new BehaviorSubject(navLinks)}
        recentlyAccessed$={new BehaviorSubject(recentNavLinks)}
      />
    );
    component.setProps({
      closeNav: () => {
        component.setProps({ isNavOpen: false });
        onClose();
      },
    });

    component.find('[data-test-subj="collapsibleNavGroup-recentlyViewed"] a').simulate('click');
    expect(onClose.callCount).toEqual(1);
    expectNavIsClosed(component);
    component.setProps({ isNavOpen: true });
    component.find('[data-test-subj="collapsibleNavGroup-kibana"] a').simulate('click');
    expect(onClose.callCount).toEqual(2);
    expectNavIsClosed(component);
    component.setProps({ isNavOpen: true });
    component.find('[data-test-subj="collapsibleNavGroup-noCategory"] a').simulate('click');
    expect(onClose.callCount).toEqual(3);
    expectNavIsClosed(component);
  });
});
