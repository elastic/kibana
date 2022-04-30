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

export function azureMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'azure';
  return {
    id: 'azureMetrics',
    name: i18n.translate('home.tutorials.azureMetrics.nameTitle', {
      defaultMessage: 'Azure Metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.azureMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Azure with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.azureMetrics.longDescription', {
      defaultMessage:
        'The `azure` Metricbeat module fetches Azure Monitor metrics. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-azure.html',
      },
    }),
    euiIconType: 'logoAzure',
    artifacts: {
      dashboards: [
        {
          id: 'eb3f05f0-ea9a-11e9-90ec-112a988266d5',
          linkLabel: i18n.translate('home.tutorials.azureMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Azure metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-azure.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/azure_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['azure', 'cloud', 'network', 'security'],
  };
}
