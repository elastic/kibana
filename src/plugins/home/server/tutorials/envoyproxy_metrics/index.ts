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

export function envoyproxyMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'envoyproxy';
  return {
    id: 'envoyproxyMetrics',
    name: i18n.translate('home.tutorials.envoyproxyMetrics.nameTitle', {
      defaultMessage: 'Envoy Proxy Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.envoyproxyMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Envoy Proxy with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.envoyproxyMetrics.longDescription', {
      defaultMessage:
        'The `envoyproxy` Metricbeat module fetches metrics from Envoy Proxy. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-envoyproxy.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/envoyproxy.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-envoyproxy.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['elastic_stack', 'datastore'],
  };
}
