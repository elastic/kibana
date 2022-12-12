/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { GuideConfig } from '../../../common';

export const securityConfig: GuideConfig = {
  title: i18n.translate('guidedOnboarding.securityGuide.title', {
    defaultMessage: 'Elastic Security guided setup',
  }),
  guideName: 'Security',
  completedGuideRedirectLocation: {
    appID: 'securitySolutionUI',
    path: '/dashboards',
  },
  description: i18n.translate('guidedOnboarding.securityGuide.description', {
    defaultMessage: `We'll help you get set up quickly, using Elastic Defend.`,
  }),
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('guidedOnboarding.securityGuide.addDataStep.title', {
        defaultMessage: 'Add data with Elastic Defend',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.securityGuide.addDataStep.description1', {
          defaultMessage: 'Use Elastic Defend to add your data.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.addDataStep.description2', {
          defaultMessage: 'See data coming in to your SIEM.',
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
          defaultMessage: 'Load the Elastic prebuilt rules.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.rulesStep.description2', {
          defaultMessage: 'Select and enable rules.',
        }),
        i18n.translate('guidedOnboarding.securityGuide.rulesStep.description3', {
          defaultMessage: 'Enable rules to generate alerts.',
        }),
      ],
      manualCompletion: {
        title: i18n.translate('guidedOnboarding.securityGuide.rulesStep.manualCompletion.title', {
          defaultMessage: 'Continue with the guide',
        }),
        description: i18n.translate(
          'guidedOnboarding.securityGuide.rulesStep.manualCompletion.description',
          {
            defaultMessage: 'After you’ve enabled the rules you need, continue.',
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
        defaultMessage: 'Manage alerts and cases',
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
      manualCompletion: {
        title: i18n.translate('guidedOnboarding.securityGuide.alertsStep.manualCompletion.title', {
          defaultMessage: 'Continue the guide',
        }),
        description: i18n.translate(
          'guidedOnboarding.securityGuide.alertsStep.manualCompletion.description',
          {
            defaultMessage: `After you've explored the case, continue.`,
          }
        ),
      },
    },
  ],
};
