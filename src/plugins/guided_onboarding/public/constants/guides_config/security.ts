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
  description: `We'll help you set up quickly, using Elastic's out-of-the-box integrations.`,
  steps: [
    {
      id: 'add_data',
      title: 'Add data with Elastic Defend',
      descriptionList: [
        'Select your integrations & start sending data.',
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
      descriptionList: ['Load prebuilt rules.', 'Select rules relevant to you.'],
      manualCompletion: {
        title: 'Continue with the tour',
        description: 'When you’ve enabled the rules you want continue...',
      },
    },
    {
      id: 'alertsCases',
      title: 'Alerts and cases',
      descriptionList: ['View and triage alerts.', 'Create cases.'],
    },
  ],
};
