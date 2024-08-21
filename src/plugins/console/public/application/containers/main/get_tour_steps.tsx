/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { EuiStatelessTourSteps } from '@elastic/eui/src/components/tour/useEuiTour';
import { i18n } from '@kbn/i18n';

export function getTourSteps() {
  return [
    {
      step: 1,
      title: 'Welcome to the Console',
      content: i18n.translate('console.tour.shellTabStep', {
        defaultMessage:
          'This is our UI for interacting with Elasticsearch clusters using QueryDSL. Easily run queries, manage settings, and view search results.',
      }),
      stepsTotal: 5,
    },
    {
      step: 2,
      title: 'Get started querying',
      content: i18n.translate('console.tour.shellTabStep', {
        defaultMessage:
          'Enter a request in this input pane, and the response will be shown in the neighboring output pane. For more details, visit our QueryDSL documentation.',
      }),
      stepsTotal: 5,
    },
    {
      step: 3,
      title: 'Step 3',
      content: i18n.translate('console.tour.shellTabStep', {
        defaultMessage:
          'Enter a request in this input pane, and the response will be shown in the neighboring output pane. For more details, visit our QueryDSL documentation.',
      }),
      stepsTotal: 5,
    },
    {
      step: 4,
      title: 'Revisit past queries',
      content: i18n.translate('console.tour.shellTabStep', {
        defaultMessage:
          'The history panel keeps track of your past queries, making it easy to review and rerun them. ',
      }),
      stepsTotal: 5,
    },
    {
      step: 5,
      title: 'Tailor your toolbox',
      content: i18n.translate('console.tour.shellTabStep', {
        defaultMessage:
          'Fine-tune your Console’s settings and manage variables to personalize your workflow to suit your work style.',
      }),
      stepsTotal: 5,
    },
  ] as EuiStatelessTourSteps;
}
