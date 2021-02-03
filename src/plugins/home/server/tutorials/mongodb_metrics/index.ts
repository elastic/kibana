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

export function mongodbMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'mongodb';
  return {
    id: 'mongodbMetrics',
    name: i18n.translate('home.tutorials.mongodbMetrics.nameTitle', {
      defaultMessage: 'MongoDB metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.mongodbMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from MongoDB.',
    }),
    longDescription: i18n.translate('home.tutorials.mongodbMetrics.longDescription', {
      defaultMessage:
        'The `mongodb` Metricbeat module fetches internal metrics from the MongoDB server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-mongodb.html',
      },
    }),
    euiIconType: 'logoMongodb',
    artifacts: {
      dashboards: [
        {
          id: 'Metricbeat-MongoDB-ecs',
          linkLabel: i18n.translate(
            'home.tutorials.mongodbMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'MongoDB metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mongodb.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mongodb_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
