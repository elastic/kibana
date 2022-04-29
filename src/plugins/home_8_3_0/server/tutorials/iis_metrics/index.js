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
exports.iisMetricsSpecProvider = iisMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function iisMetricsSpecProvider(context) {
  const moduleName = 'iis';
  return {
    id: 'iisMetrics',
    name: _i18n.i18n.translate('home.tutorials.iisMetrics.nameTitle', {
      defaultMessage: 'IIS Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.iisMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from IIS HTTP servers with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.iisMetrics.longDescription', {
      defaultMessage:
        'The `iis` Metricbeat module collects metrics from IIS server and the application pools and websites running. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-iis.html',
      },
    }),
    isBeta: true,
    euiIconType: '/plugins/home/assets/logos/iis.svg',
    artifacts: {
      dashboards: [
        {
          id: 'ebc23240-8572-11ea-91bc-ab084c7ec0e7',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.iisMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'IIS metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-iis.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/iis_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['web'],
  };
}
