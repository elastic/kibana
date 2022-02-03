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

export function dropwizardMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'dropwizard';
  return {
    id: 'dropwizardMetrics',
    name: i18n.translate('home.tutorials.dropwizardMetrics.nameTitle', {
      defaultMessage: 'Dropwizard Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.dropwizardMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Dropwizard Java applciations with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.dropwizardMetrics.longDescription', {
      defaultMessage:
        'The `dropwizard` Metricbeat module fetches metrics from Dropwizard Java Application. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-dropwizard.html',
      },
    }),
    euiIconType: 'logoDropwizard',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.dropwizardMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-dropwizard.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['elastic_stack', 'datastore'],
  };
}
