/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../../types';

export const securityConfig: GuideConfig = {
  title: 'Elastic Security guided setup',
  guideName: 'Security',
  completedGuideRedirectLocation: {
    appID: 'security',
    path: '/app/security/dashboards',
  },
  description: `We'll help you get set up quickly, using Elastic's out-of-the-box integrations.`,
  steps: [
    {
      id: 'add_data',
      title: 'Add data with Elastic Defend',
      descriptionList: [
        'Select the Elastic Defend integration to add your data.',
        'Make sure your data looks good.',
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
      descriptionList: ['Load the prebuilt rules.', 'Select the rules that you want.'],
      manualCompletion: {
        title: 'Continue with the tour',
        description: 'When you’ve enabled the rules you want continue...',
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: 'Alerts and cases',
      descriptionList: ['View and triage alerts.', 'Create a case.'],
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
    },
  ],
};
