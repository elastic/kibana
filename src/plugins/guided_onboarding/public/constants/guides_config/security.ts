/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { GuideConfig } from '../../types';

export const securityConfig: GuideConfig = {
  title: i18n.translate('guidedOnboarding.securityGuide.title', {
    defaultMessage: 'Elastic Security guided setup',
  }),
  guideName: 'Security',
  completedGuideRedirectLocation: {
    appID: 'security',
    path: '/app/security/dashboards',
  },
  description: i18n.translate('guidedOnboarding.securityGuide.description', {
    defaultMessage: `We'll help you get set up quickly, using Elastic's out-of-the-box integrations.`,
  }),
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('guidedOnboarding.securityGuide.addDataStep.title', {
        defaultMessage: 'Add data with Elastic Defend',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.securityGuide.addDataStep.description1', {
          defaultMessage: 'Select the Elastic Defend integration to add your data.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.addDataStep.description2', {
          defaultMessage: 'Make sure your data looks good.',
        }),
      ],
      integration: 'endpoint',
      location: {
        appID: 'integrations',
        path: '/browse/security',
      },
    },
    {
      id: 'rules',
      title: i18n.translate('guidedOnboarding.securityGuide.rulesStep.title', {
        defaultMessage: 'Turn on rules',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.securityGuide.rulesStep.description1', {
          defaultMessage: 'Load the prebuilt rules.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.rulesStep.description2', {
          defaultMessage: 'Select the rules that you want.',
        }),
      ],
      manualCompletion: {
        title: i18n.translate('guidedOnboarding.securityGuide.rulesStep.manualCompletion.title', {
          defaultMessage: 'Continue with the tour',
        }),
        description: i18n.translate(
          'guidedOnboarding.securityGuide.rulesStep.manualCompletion.description',
          {
            defaultMessage: 'After you’ve enabled the rules you want, click here to continue.',
          }
        ),
      },
      location: {
        appID: 'securitySolutionUI',
        path: '/rules',
      },
    },
    {
      id: 'alertsCases',
      title: i18n.translate('guidedOnboarding.securityGuide.alertsStep.title', {
        defaultMessage: 'Alerts and cases',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.securityGuide.alertsStep.description1', {
          defaultMessage: 'View and triage alerts.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.alertsStep.description2', {
          defaultMessage: 'Create a case.',
        }),
      ],
      location: {
        appID: 'securitySolutionUI',
        path: '/alerts',
      },
    },
  ],
};
