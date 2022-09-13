/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../types';

export const securityConfig: GuideConfig = {
  title: 'Get started with SIEM',
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
  steps: [
    {
      id: 'add_data',
      title: 'Add and view your data',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
    },
    {
      id: 'rules',
      title: 'Turn on rules',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      id: 'alerts',
      title: 'View Alerts',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      id: 'cases',
      title: 'Cases and investigations',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      id: 'do_more',
      title: 'Do more with Elastic Security',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
  ],
};
