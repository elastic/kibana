/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.azureMetricsSpecProvider = azureMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function azureMetricsSpecProvider(context) {
  const moduleName = 'azure';
  return {
    id: 'azureMetrics',
    name: _i18n.i18n.translate('home.tutorials.azureMetrics.nameTitle', {
      defaultMessage: 'Azure Metrics',
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.azureMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Azure with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.azureMetrics.longDescription', {
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
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.azureMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Azure metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-azure.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/azure_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['azure', 'cloud', 'network', 'security'],
  };
}
