/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavigationNodeViewModel } from '../../../types';

// TODO: Declare ChromeNavigationNode[] (with "link" to app id or deeplink id)
// and then call an api on the Chrome service to convert to ChromeNavigationNodeViewModel
// with its "href", "isActive"... metadata

export const analyticsItemSet: ChromeNavigationNodeViewModel[] = [
  {
    title: '',
    id: 'root',
    items: [
      {
        title: 'Discover',
        id: 'discover',
        href: '/app/discover',
      },
      {
        title: 'Dashboard',
        id: 'dashboard',
        href: '/app/dashboards',
      },
      {
        title: 'Visualize Library',
        id: 'visualize_library',
        href: '/app/visualize',
      },
    ],
  },
];
