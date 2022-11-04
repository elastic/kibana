/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLink } from '@elastic/eui';
import type { GuideConfig } from '../../types';

export const observabilityConfig: GuideConfig = {
  title: i18n.translate('guidedOnboarding.observabilityGuide.title', {
    defaultMessage: 'Observe my Kubernetes infrastructure',
  }),
  description: i18n.translate('guidedOnboarding.observabilityGuide.description', {
    defaultMessage: `We'll help you quickly get visibility into your Kubernetes environment with our Elastic integration. Gain deep insights from your logs, metrics, and traces to proactively detect issues and take action to resolve them.`,
  }),
  guideName: 'Kubernetes',
  docs: {
    text: i18n.translate('guidedOnboarding.observabilityGuide.documentationLink', {
      defaultMessage: 'Learn more',
    }),
    url: 'https://docs.elastic.co/en/integrations/kubernetes',
  },
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('guidedOnboarding.observabilityGuide.addDataStep.title', {
        defaultMessage: 'Add and verify your data',
      }),
      integration: 'kubernetes',
      descriptionList: [
        <FormattedMessage
          id="guidedOnboarding.observabilityGuide.addDataStep.description"
          defaultMessage="Deploy {kubeStateMetricsLink} service to your Kubernetes."
          values={{
            kubeStateMetricsLink: (
              <EuiLink
                external
                target="_blank"
                href="https://github.com/kubernetes/kube-state-metrics"
              >
                kube-state-metrics
              </EuiLink>
            ),
          }}
        />,
        i18n.translate('guidedOnboarding.observabilityGuide.addDataStep.description', {
          defaultMessage: 'Add the Elastic Kubernetes integration.',
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
      description: i18n.translate(
        'guidedOnboarding.observabilityGuide.viewDashboardStep.description',
        {
          defaultMessage: 'Stream, visualize, and analyze your Kubernetes infrastructure metrics.',
        }
      ),
      location: {
        appID: 'dashboards',
        path: '#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
      },
      manualCompletion: {
        title: i18n.translate(
          'guidedOnboarding.observabilityGuide.viewDashboardStep.manualCompletionPopoverTitle',
          {
            defaultMessage: 'Explore Kubernetes dashboards',
          }
        ),
        description: i18n.translate(
          'guidedOnboarding.observabilityGuide.viewDashboardStep.manualCompletionPopoverDescription',
          {
            defaultMessage: `Take your time to explore these pre-built dashboards included with the Kubernetes integration. When you’re ready, click the Setup guide button to continue.`,
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
      description: i18n.translate(
        'guidedOnboarding.observabilityGuide.tourObservabilityStep.description',
        {
          defaultMessage:
            'Get familiar with the rest of Elastic Observability and explore even more integrations.',
        }
      ),
      location: {
        appID: 'observability',
        path: '/overview',
      },
    },
  ],
};
