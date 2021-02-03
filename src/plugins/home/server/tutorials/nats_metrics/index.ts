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

export function natsMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'nats';
  return {
    id: 'natsMetrics',
    name: i18n.translate('home.tutorials.natsMetrics.nameTitle', {
      defaultMessage: 'NATS metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.natsMetrics.shortDescription', {
      defaultMessage: 'Fetch monitoring metrics from the Nats server.',
    }),
    longDescription: i18n.translate('home.tutorials.natsMetrics.longDescription', {
      defaultMessage:
        'The `nats` Metricbeat module fetches monitoring metrics from Nats. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-nats.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/nats.svg',
    artifacts: {
      dashboards: [
        {
          id: 'Metricbeat-Nats-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.natsMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'NATS metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-nats.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/nats_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
