/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';
import { locatorIds } from './_locators';

export const analyticsItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Discover',
        id: 'discover',
        locator: { id: locatorIds.discover },
      },
      {
        name: 'Dashboard',
        id: 'dashboard',
        locator: { id: locatorIds.dashboard },
      },
      {
        name: 'Visualize Library',
        id: 'visualize_library',
        locator: { id: locatorIds.visualizeLibrary },
      },
    ],
  },
];
