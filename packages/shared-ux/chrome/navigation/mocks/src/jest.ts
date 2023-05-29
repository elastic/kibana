/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { NavigationServices, ChromeNavigationNodeViewModel } from '../../types';

export const getServicesMock = (): NavigationServices => {
  const navigateToUrl = jest.fn().mockResolvedValue(undefined);
  const basePath = { prepend: jest.fn((path: string) => `/base${path}`) };
  const loadingCount$ = new BehaviorSubject(0);
  const recentlyAccessed$ = new BehaviorSubject([]);

  return {
    basePath,
    loadingCount$,
    recentlyAccessed$,
    navIsOpen: true,
    navigateToUrl,
  };
};

export const getSolutionPropertiesMock = (): ChromeNavigationNodeViewModel => ({
  id: 'example_project',
  icon: 'logoObservability',
  title: 'Example project',
  items: [
    {
      id: 'root',
      title: '',
      items: [
        {
          id: 'get_started',
          title: 'Get started',
          href: '/app/example_project/get_started',
        },
        {
          id: 'alerts',
          title: 'Alerts',
          href: '/app/example_project/alerts',
        },
        {
          id: 'cases',
          title: 'Cases',
          href: '/app/example_project/cases',
        },
      ],
    },
    {
      id: 'example_settings',
      title: 'Settings',
      items: [
        {
          id: 'logs',
          title: 'Logs',
          href: '/app/management/logs',
        },
        {
          id: 'signals',
          title: 'Signals',
          href: '/app/management/signals',
        },
        {
          id: 'tracing',
          title: 'Tracing',
          href: '/app/management/tracing',
        },
      ],
    },
  ],
});
