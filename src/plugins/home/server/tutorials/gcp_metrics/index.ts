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

export function gcpMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'gcp';
  return {
    id: 'gcpMetrics',
    name: i18n.translate('home.tutorials.gcpMetrics.nameTitle', {
      defaultMessage: 'Google Cloud Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.gcpMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Google Cloud Platform with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.gcpMetrics.longDescription', {
      defaultMessage:
        'The `gcp` Metricbeat module fetches metrics from Google Cloud Platform using Stackdriver Monitoring API. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-gcp.html',
      },
    }),
    euiIconType: 'logoGCP',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: 'f40ee870-5e4a-11ea-a4f6-717338406083',
          linkLabel: i18n.translate('home.tutorials.gcpMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Google Cloud metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-gcp.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/gcp_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['google_cloud', 'cloud', 'network', 'security'],
  };
}
