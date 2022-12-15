/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {CmItem} from '../../../types';

export const items: Record<string, CmItem[]> = {
  user: [
    {
      id: 'user:123',
      fields: {
        title: 'John Doe',
      },
      content: {},
    },
    {
      id: 'user:456',
      fields: {
        title: 'Jane Doe',
      },
      content: {},
    },
    {
      id: 'user:789',
      fields: {
        title: '',
      },
      content: {},
    },
  ],
  dashboard: [
    {
      id: 'dashboard:xyz',
      fields: {
        title: 'User subscription analytics dashboard',
        description: 'This dashboard shows the analytics of user subscriptions.',
      },
      content: {},
    },
    {
      id: 'dashboard:abc',
      fields: {
        title: 'Threat detection dashboard',
        description: 'We use this dashboard to detect threats across our network.',
      },
      content: {},
    },
  ],
};
