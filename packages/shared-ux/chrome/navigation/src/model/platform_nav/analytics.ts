/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';

export const analyticsItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Discover',
        id: 'discover',
        locator: { id: 'DISCOVER_APP_LOCATOR', params: {} },
      },
      {
        name: 'Dashboard',
        id: 'dashboard',
        locator: { id: 'DASHBOARD_APP_LOCATOR', params: {} },
      },
      {
        name: 'Visualize Library',
        id: 'visualize_library',
        locator: { id: 'VISUALIZE_APP_LOCATOR', params: {} },
      },
    ],
  },
];
