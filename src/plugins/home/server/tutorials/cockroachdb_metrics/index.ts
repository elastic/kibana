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

export function cockroachdbMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'cockroachdb';
  return {
    id: 'cockroachdbMetrics',
    name: i18n.translate('home.tutorials.cockroachdbMetrics.nameTitle', {
      defaultMessage: 'CockroachDB Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.cockroachdbMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from CockroachDB servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.cockroachdbMetrics.longDescription', {
      defaultMessage:
        'The `cockroachdb` Metricbeat module fetches metrics from CockroachDB. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-cockroachdb.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/cockroachdb.svg',
    artifacts: {
      dashboards: [
        {
          id: 'e3ba0c30-9766-11e9-9eea-6f554992ec1f',
          linkLabel: i18n.translate(
            'home.tutorials.cockroachdbMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'CockroachDB metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-cockroachdb.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/cockroachdb_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
