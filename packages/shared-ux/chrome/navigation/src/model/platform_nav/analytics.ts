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
        href: '/app/discover',
      },
      {
        name: 'Dashboard',
        id: 'dashboard',
        href: '/app/dashboards',
      },
      {
        name: 'Visualize Library',
        id: 'visualize_library',
        href: '/app/visualize',
      },
    ],
  },
];
