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

export function mysqlMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'mysql';
  return {
    id: 'mysqlMetrics',
    name: i18n.translate('home.tutorials.mysqlMetrics.nameTitle', {
      defaultMessage: 'MySQL Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.mysqlMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from MySQL servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.mysqlMetrics.longDescription', {
      defaultMessage:
        'The `mysql` Metricbeat module fetches metrics from MySQL server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-mysql.html',
      },
    }),
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [
        {
          id: '66881e90-0006-11e7-bf7f-c9acc3d3e306-ecs',
          linkLabel: i18n.translate('home.tutorials.mysqlMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'MySQL metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mysql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mysql_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['datastore'],
  };
}
