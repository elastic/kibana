/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/metricbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function stanMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'stan';
  return {
    id: 'stanMetrics',
    name: i18n.translate('home.tutorials.stanMetrics.nameTitle', {
      defaultMessage: 'STAN Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.stanMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from STAN servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.stanMetrics.longDescription', {
      defaultMessage:
        'The `stan` Metricbeat module fetches metrics from STAN. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-stan.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/stan.svg',
    artifacts: {
      dashboards: [
        {
          id: 'dbf2e220-37ce-11ea-a9c8-152a657da3ab',
          linkLabel: i18n.translate('home.tutorials.stanMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Stan metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-stan.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/stan_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['message_queue', 'kubernetes'],
  };
}
