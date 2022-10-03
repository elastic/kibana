/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../../types';

export const observabilityConfig: GuideConfig = {
  title: 'Observe my infrastructure',
  description:
    'The foundation of seeing Elastic in action, is adding you own data. Follow links to our documents below to learn more.',
  docs: {
    text: 'Observability 101 Documentation',
    url: 'example.com',
  },
  steps: [
    {
      id: 'add_data',
      title: 'Add data',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
    },
    {
      id: 'view_dashboard',
      title: 'View Kubernetes metrics',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
    },
    {
      id: 'tour_observability',
      title: 'Tour Elastic Observability',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
    },
  ],
};
