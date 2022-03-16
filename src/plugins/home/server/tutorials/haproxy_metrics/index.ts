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

export function haproxyMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'haproxy';
  return {
    id: 'haproxyMetrics',
    name: i18n.translate('home.tutorials.haproxyMetrics.nameTitle', {
      defaultMessage: 'HAProxy Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.haproxyMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from HAProxy servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.haproxyMetrics.longDescription', {
      defaultMessage:
        'The `haproxy` Metricbeat module fetches metrics from HAProxy. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-haproxy.html',
      },
    }),
    euiIconType: 'logoHAproxy',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.haproxyMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-haproxy.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['network', 'web'],
  };
}
