/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../../types';

export const securityConfig: GuideConfig = {
  title: 'Get started with SIEM',
  guideName: 'Security',
  completedGuideRedirectLocation: {
    appID: 'security',
    path: '/app/security/dashboards',
  },
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ligula enim, malesuada a finibus vel, cursus sed risus. Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
  steps: [
    {
      id: 'add_data',
      title: 'Add and view your data',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
      integration: 'endpoint',
      location: {
        appID: 'integrations',
        path: '/browse/security',
      },
    },
    {
      id: 'rules',
      title: 'Turn on rules',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
      manualCompletion: {
        title: 'Manual completion step title',
        description:
          'Mark the step complete by opening the panel and clicking the button "Mark done"',
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: 'Alerts and cases',
      descriptionList: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Nullam ligula enim, malesuada a finibus vel, cursus sed risus.',
        'Vivamus pretium, elit dictum lacinia aliquet, libero nibh dictum enim, a rhoncus leo magna in sapien.',
      ],
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
    },
  ],
};
