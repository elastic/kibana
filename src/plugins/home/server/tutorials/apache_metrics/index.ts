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

export function apacheMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'apache';
  return {
    id: 'apacheMetrics',
    name: i18n.translate('home.tutorials.apacheMetrics.nameTitle', {
      defaultMessage: 'Apache HTTP Server Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.apacheMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Apache HTTP servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.apacheMetrics.longDescription', {
      defaultMessage:
        'The `apache` Metricbeat module fetches metrics from Apache 2 HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-apache.html',
      },
    }),
    euiIconType: 'logoApache',
    artifacts: {
      dashboards: [
        {
          id: 'Metricbeat-Apache-HTTPD-server-status-ecs',
          linkLabel: i18n.translate('home.tutorials.apacheMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Apache metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-apache.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/apache_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['web'],
  };
}
