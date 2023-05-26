/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NodeDefinition } from '../types';

export const analytics: NodeDefinition = {
  id: 'group1',
  title: 'Data exploration',
  icon: 'stats',
  children: [
    {
      id: 'root',
      children: [
        {
          id: 'discover',
          title: 'Discover',
        },
        {
          id: 'dashboard',
          title: 'Dashboard',
        },
        {
          id: 'visualize',
          title: 'Visualize library',
        },
      ],
    },
  ],
};
