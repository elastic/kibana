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
exports.mssqlMetricsSpecProvider = mssqlMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function mssqlMetricsSpecProvider(context) {
  const moduleName = 'mssql';
  return {
    id: 'mssqlMetrics',
    name: _i18n.i18n.translate('home.tutorials.mssqlMetrics.nameTitle', {
      defaultMessage: 'Microsoft SQL Server Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.mssqlMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Microsoft SQL Server instances with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mssqlMetrics.longDescription', {
      defaultMessage:
        'The `mssql` Metricbeat module fetches monitoring, log and performance metrics from a Microsoft SQL Server instance. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-mssql.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/mssql.svg',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: 'a2ead240-18bb-11e9-9836-f37dedd3b411-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.mssqlMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Microsoft SQL Server metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mssql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mssql_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore'],
  };
}
