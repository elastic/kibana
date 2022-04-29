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
exports.mysqlMetricsSpecProvider = mysqlMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function mysqlMetricsSpecProvider(context) {
  const moduleName = 'mysql';
  return {
    id: 'mysqlMetrics',
    name: _i18n.i18n.translate('home.tutorials.mysqlMetrics.nameTitle', {
      defaultMessage: 'MySQL Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.mysqlMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from MySQL servers with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mysqlMetrics.longDescription', {
      defaultMessage:
        'The `mysql` Metricbeat module fetches metrics from MySQL server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-mysql.html',
      },
    }),
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [
        {
          id: '66881e90-0006-11e7-bf7f-c9acc3d3e306-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.mysqlMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'MySQL metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mysql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mysql_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore'],
  };
}
