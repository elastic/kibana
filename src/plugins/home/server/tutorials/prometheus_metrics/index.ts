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

export function prometheusMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'prometheus';
  return {
    id: moduleName + 'Metrics',
    name: i18n.translate('home.tutorials.prometheusMetrics.nameTitle', {
      defaultMessage: 'Prometheus metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.prometheusMetrics.shortDescription', {
      defaultMessage: 'Fetch metrics from a Prometheus exporter.',
    }),
    longDescription: i18n.translate('home.tutorials.prometheusMetrics.longDescription', {
      defaultMessage:
        'The `{moduleName}` Metricbeat module fetches metrics from Prometheus endpoint. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-' + moduleName + '.html',
      },
    }),
    euiIconType: 'logoPrometheus',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.prometheusMetrics.artifacts.application.label', {
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
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
