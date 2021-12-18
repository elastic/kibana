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

export function uwsgiMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'uwsgi';
  return {
    id: 'uwsgiMetrics',
    name: i18n.translate('home.tutorials.uwsgiMetrics.nameTitle', {
      defaultMessage: 'uWSGI Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.uwsgiMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from uWSGI servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.uwsgiMetrics.longDescription', {
      defaultMessage:
        'The `uwsgi` Metricbeat module fetches metrics from uWSGI server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-uwsgi.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/uwsgi.svg',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: '32fca290-f0af-11e7-b9ff-9f96241065de-ecs',
          linkLabel: i18n.translate('home.tutorials.uwsgiMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'uWSGI metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-uwsgi.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/uwsgi_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['web', 'security'],
  };
}
