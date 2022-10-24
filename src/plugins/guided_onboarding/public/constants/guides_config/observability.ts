/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type { GuideConfig } from '../../types';

export const observabilityConfig: GuideConfig = {
  title: i18n.translate('guidedOnboarding.observabilityGuide.title', {
    defaultMessage: 'Observe my Kubernetes infrastructure',
  }),
  description: i18n.translate('guidedOnboarding.observabilityGuide.description', {
    defaultMessage: `We'll help you quickly gain visibility into your Kubernetes environment using Elastic's out-of-the-box integration. Gain deep insights from your logs, metrics, and traces, and proactively detect issues and take action to resolve issues.`,
  }),
  guideName: 'Kubernetes',
  docs: {
    text: i18n.translate('guidedOnboarding.observabilityGuide.documentationLink', {
      defaultMessage: 'Kubernetes documentation',
    }),
    url: 'https://docs.elastic.co/en/integrations/kubernetes',
  },
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('guidedOnboarding.observabilityGuide.addDataStep.title', {
        defaultMessage: 'Add data',
      }),
      integration: 'kubernetes',
      descriptionList: [
        i18n.translate('guidedOnboarding.observabilityGuide.addDataStep.description', {
          defaultMessage: 'Start by adding your data by setting up the Kubernetes integration.',
        }),
      ],
      location: {
        appID: 'integrations',
        path: '/detail/kubernetes/overview',
      },
    },
    {
      id: 'view_dashboard',
      title: i18n.translate('guidedOnboarding.observabilityGuide.viewDashboardStep.title', {
        defaultMessage: 'Explore Kubernetes metrics',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.observabilityGuide.viewDashboardStep.description', {
          defaultMessage: 'Stream, visualize, and analyze your Kubernetes infrastructure metrics.',
        }),
      ],
      location: {
        appID: 'dashboards',
        path: '#/view/kubernetes-e0195ce0-bcaf-11ec-b64f-7dd6e8e82013',
      },
      manualCompletion: {
        title: i18n.translate(
          'guidedOnboarding.observabilityGuide.viewDashboardStep.manualCompletionPopoverTitle',
          {
            defaultMessage: 'Explore the pre-built Kubernetes dashboards',
          }
        ),
        description: i18n.translate(
          'guidedOnboarding.observabilityGuide.viewDashboardStep.manualCompletionPopoverDescription',
          {
            defaultMessage: `Take your time to explore out-of-the-box dashboards that are included with the Kubernetes integration. When you're ready, you can access the next step of the guide in the button above.`,
          }
        ),
        readyToCompleteOnNavigation: true,
      },
    },
    {
      id: 'tour_observability',
      title: i18n.translate('guidedOnboarding.observabilityGuide.tourObservabilityStep.title', {
        defaultMessage: 'Tour Elastic Observability',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.observabilityGuide.tourObservabilityStep.description', {
          defaultMessage:
            'Get familiar with the rest of Elastic Observability and explore even more integrations.',
        }),
      ],
      location: {
        appID: 'observability',
        path: '/overview',
      },
    },
  ],
};
