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

export function couchbaseMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'couchbase';
  return {
    id: 'couchbaseMetrics',
    name: i18n.translate('home.tutorials.couchbaseMetrics.nameTitle', {
      defaultMessage: 'Couchbase Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.couchbaseMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Couchbase databases with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.couchbaseMetrics.longDescription', {
      defaultMessage:
        'The `couchbase` Metricbeat module fetches metrics from Couchbase. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-couchbase.html',
      },
    }),
    euiIconType: 'logoCouchbase',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.couchbaseMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-couchbase.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
