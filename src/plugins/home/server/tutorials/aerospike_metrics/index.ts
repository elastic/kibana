/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/metricbeat_instructions';
import {
  TutorialContext,
  TutorialsCategory,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function aerospikeMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'aerospike';
  return {
    id: 'aerospikeMetrics',
    name: i18n.translate('home.tutorials.aerospikeMetrics.nameTitle', {
      defaultMessage: 'Aerospike Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.aerospikeMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Aerospike servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.aerospikeMetrics.longDescription', {
      defaultMessage:
        'The `aerospike` Metricbeat module fetches metrics from Aerospike. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-aerospike.html',
      },
    }),
    euiIconType: 'logoAerospike',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.aerospikeMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-aerospike.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['web'],
  };
}
