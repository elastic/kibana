/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import sinon from 'sinon';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '@kbn/core-chrome-browser';
import { TestChromeProviders } from '../test_helpers';
import { CollapsibleNav } from './collapsible_nav';

const { kibana, observability, security, management } = DEFAULT_APP_CATEGORIES;

const visibleIn = ['globalSearch' as const, 'sideNav' as const];

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
    visibleIn,
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
    id: 'collapsibe-nav',
    isNavOpen: false,
    storage: new StubBrowserStorage(),
    closeNav: () => {},
    button: <button />,
  };
}

function createChromeMock({
  recentlyAccessed = [],
  customNavLink,
  navLinks = [],
}: {
  recentlyAccessed?: ChromeRecentlyAccessedHistoryItem[];
  customNavLink?: ChromeNavLink;
  navLinks?: ChromeNavLink[];
} = {}) {
  const chrome = chromeServiceMock.createStartContract();
  chrome.recentlyAccessed.get$.mockReturnValue(new BehaviorSubject(recentlyAccessed));
  chrome.getCustomNavLink$.mockReturnValue(new BehaviorSubject(customNavLink));
  chrome.navLinks.getNavLinks$.mockReturnValue(new BehaviorSubject(navLinks));
  return chrome;
}

function createWrapper(chrome: ReturnType<typeof createChromeMock>) {
  return ({ children }: PropsWithChildren<unknown>) => (
    <TestChromeProviders chrome={chrome}>{children}</TestChromeProviders>
  );
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
  it('renders the default nav', () => {
    const chrome = createChromeMock();
    const component = mount(<CollapsibleNav {...mockProps()} />, {
      wrappingComponent: createWrapper(chrome) as any,
    });
    expect(component).toMatchSnapshot();

    component.setProps({ isOpen: true });
    expect(component).toMatchSnapshot();
  });

  it('renders links grouped by category', () => {
    const navLinks = [
      mockLink({ title: 'discover', category: kibana }),
      mockLink({ title: 'siem', category: security }),
      mockLink({ title: 'metrics', category: observability }),
      mockLink({ title: 'monitoring', category: management }),
      mockLink({ title: 'visualize', category: kibana }),
      mockLink({ title: 'dashboard', category: kibana }),
      mockLink({ title: 'canvas' }),
      mockLink({ title: 'logs', category: observability }),
    ];
    const recentNavLinks = [
      mockRecentNavLink({ label: 'recent 1' }),
      mockRecentNavLink({ label: 'recent 2' }),
    ];
    const customNavLink = mockLink({ title: 'Custom link' });
    const chrome = createChromeMock({
      recentlyAccessed: recentNavLinks,
      customNavLink,
      navLinks,
    });
    const component = mount(<CollapsibleNav {...mockProps()} isNavOpen={true} />, {
      wrappingComponent: createWrapper(chrome) as any,
    });
    expect(component.render()).toMatchSnapshot();
  });

  it('remembers collapsible section state', () => {
    const navLinks = [mockLink({ category: kibana }), mockLink({ category: observability })];
    const recentNavLinks = [mockRecentNavLink({})];
    const chrome = createChromeMock({ recentlyAccessed: recentNavLinks, navLinks });
    const component = mount(<CollapsibleNav {...mockProps()} isNavOpen={true} />, {
      wrappingComponent: createWrapper(chrome) as any,
    });
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
    const chrome = createChromeMock({ recentlyAccessed: recentNavLinks, navLinks });
    const component = mount(<CollapsibleNav {...mockProps()} isNavOpen={true} />, {
      wrappingComponent: createWrapper(chrome) as any,
    });
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
