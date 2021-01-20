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

export function golangMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'golang';
  return {
    id: moduleName + 'Metrics',
    name: i18n.translate('home.tutorials.golangMetrics.nameTitle', {
      defaultMessage: 'Golang metrics',
    }),
    moduleName,
    isBeta: true,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.golangMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from a Golang app.',
    }),
    longDescription: i18n.translate('home.tutorials.golangMetrics.longDescription', {
      defaultMessage:
        'The `{moduleName}` Metricbeat module fetches internal metrics from a Golang app. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: `{config.docs.beats.metricbeat}/metricbeat-module-${moduleName}.html`,
      },
    }),
    euiIconType: 'logoGolang',
    artifacts: {
      dashboards: [
        {
          id: 'f2dc7320-f519-11e6-a3c9-9d1f7c42b045-ecs',
          linkLabel: i18n.translate('home.tutorials.golangMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Golang metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-' + moduleName + '.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
