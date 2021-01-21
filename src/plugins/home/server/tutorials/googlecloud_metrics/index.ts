/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

export function googlecloudMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'googlecloud';
  return {
    id: 'googlecloudMetrics',
    name: i18n.translate('home.tutorials.googlecloudMetrics.nameTitle', {
      defaultMessage: 'Google Cloud metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.googlecloudMetrics.shortDescription', {
      defaultMessage:
        'Fetch monitoring metrics from Google Cloud Platform using Stackdriver Monitoring API.',
    }),
    longDescription: i18n.translate('home.tutorials.googlecloudMetrics.longDescription', {
      defaultMessage:
        'The `googlecloud` Metricbeat module fetches monitoring metrics from Google Cloud Platform using Stackdriver Monitoring API. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-googlecloud.html',
      },
    }),
    euiIconType: 'logoGCP',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: 'f40ee870-5e4a-11ea-a4f6-717338406083',
          linkLabel: i18n.translate(
            'home.tutorials.googlecloudMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Google Cloud metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-googlecloud.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/googlecloud_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
