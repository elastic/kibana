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

export function logstashMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'logstash';
  return {
    id: moduleName + 'Metrics',
    name: i18n.translate('home.tutorials.logstashMetrics.nameTitle', {
      defaultMessage: 'Logstash Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.logstashMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Logstash servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.logstashMetrics.longDescription', {
      defaultMessage:
        'The `{moduleName}` Metricbeat module fetches metrics from a Logstash server. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: `{config.docs.beats.metricbeat}/metricbeat-module-${moduleName}.html`,
      },
    }),
    euiIconType: 'logoLogstash',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.logstashMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-' + moduleName + '.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['custom'],
  };
}
