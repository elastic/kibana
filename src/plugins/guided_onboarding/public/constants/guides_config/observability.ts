/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GuideConfig } from '../../types';

export const observabilityConfig: GuideConfig = {
  title: 'Observe my Kubernetes infrastructure',
  description: `We'll help you quickly gain visibility into your Kubernetes environment using Elastic's out-of-the-box integration. Gain deep insights from your logs, metrics, and traces, and proactively detect issues and take action to resolve issues.`,
  docs: {
    text: 'Kubernetes documentation',
    url: 'example.com', // TODO update link to correct docs page
  },
  steps: [
    {
      id: 'add_data',
      title: 'Add data',
      integration: 'kubernetes',
      descriptionList: ['Start by adding your data by setting up the Kubernetes integration.'],
      location: {
        appID: 'integrations',
        path: '/detail/kubernetes/overview',
      },
    },
    {
      id: 'view_dashboard',
      title: 'Explore Kubernetes metrics',
      descriptionList: ['Stream, visualize, and analyze your Kubernetes infrastructure metrics.'],
      location: {
        appID: 'dashboards',
        path: '#/view/kubernetes-e0195ce0-bcaf-11ec-b64f-7dd6e8e82013',
      },
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
