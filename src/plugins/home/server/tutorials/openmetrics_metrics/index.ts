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

export function openmetricsMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'openmetrics';
  return {
    id: 'openmetricsMetrics',
    name: i18n.translate('home.tutorials.openmetricsMetrics.nameTitle', {
      defaultMessage: 'OpenMetrics Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.openmetricsMetrics.shortDescription', {
      defaultMessage:
        'Collect metrics from an endpoint that serves metrics in OpenMetrics format with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.openmetricsMetrics.longDescription', {
      defaultMessage:
        'The `openmetrics` Metricbeat module fetches metrics from an endpoint that serves metrics in OpenMetrics format. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-openmetrics.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/openmetrics.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-openmetrics.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['security'],
  };
}
