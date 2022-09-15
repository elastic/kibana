/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../types';

export const searchConfig: GuideConfig = {
  title: 'Search my data',
  description: `We'll help you build world-class search experiences with your data.`,
  docs: {
    text: 'Enterprise Search 101 Documentation',
    url: 'example.com',
  },
  steps: [
    {
      id: 'add_data',
      title: 'Add data',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      location: {
        appID: 'guidedOnboardingExample',
        path: 'stepOne',
      },
    },
    {
      id: 'search_experience',
      title: 'Build a search experience',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      location: {
        appID: 'guidedOnboardingExample',
        path: 'stepTwo?showTour=true',
      },
    },
    {
      id: 'optimize',
      title: 'Optimize your search relevance',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
    },
    {
      id: 'review',
      title: 'Review your search analytics',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
    },
  ],
};
