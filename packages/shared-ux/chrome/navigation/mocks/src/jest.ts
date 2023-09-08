/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { BehaviorSubject, of } from 'rxjs';
import { NavigationServices } from '../../types';
import { navLinksMock } from './navlinks';

const activeNodes: ChromeProjectNavigationNode[][] = [];

export const getServicesMock = ({
  navLinks = navLinksMock,
}: { navLinks?: ChromeNavLink[] } = {}): NavigationServices => {
  const navigateToUrl = jest.fn().mockResolvedValue(undefined);
  const basePath = { prepend: jest.fn((path: string) => `/base${path}`) };
  const recentlyAccessed$ = new BehaviorSubject([]);
  const navLinks$ = new BehaviorSubject(navLinks);

  return {
    basePath,
    recentlyAccessed$,
    navLinks$,
    navIsOpen: true,
    navigateToUrl,
    onProjectNavigationChange: jest.fn(),
    activeNodes$: of(activeNodes),
    cloudLinks: {
      billingAndSub: {
        title: 'Mock Billing & Subscriptions',
        href: 'https://cloud.elastic.co/account/billing',
      },
      performance: {
        title: 'Mock Performance',
        href: 'https://cloud.elastic.co/deployments/123456789/performance',
      },
      userAndRoles: {
        title: 'Mock Users & Roles',
        href: 'https://cloud.elastic.co/deployments/123456789/security/users',
      },
    },
  };
};
