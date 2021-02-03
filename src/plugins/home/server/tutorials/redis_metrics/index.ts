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

export function redisMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'redis';
  return {
    id: 'redisMetrics',
    name: i18n.translate('home.tutorials.redisMetrics.nameTitle', {
      defaultMessage: 'Redis metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.redisMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from Redis.',
    }),
    longDescription: i18n.translate('home.tutorials.redisMetrics.longDescription', {
      defaultMessage:
        'The `redis` Metricbeat module fetches internal metrics from the Redis server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-redis.html',
      },
    }),
    euiIconType: 'logoRedis',
    artifacts: {
      dashboards: [
        {
          id: 'AV4YjZ5pux-M-tCAunxK-ecs',
          linkLabel: i18n.translate('home.tutorials.redisMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Redis metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-redis.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/redis_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
