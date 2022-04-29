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
exports.redisenterpriseMetricsSpecProvider = redisenterpriseMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function redisenterpriseMetricsSpecProvider(context) {
  const moduleName = 'redisenterprise';
  return {
    id: 'redisenterpriseMetrics',
    name: _i18n.i18n.translate('home.tutorials.redisenterpriseMetrics.nameTitle', {
      defaultMessage: 'Redis Enterprise Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate(
      'home.tutorials.redisenterpriseMetrics.shortDescription',
      {
        defaultMessage: 'Collect metrics from Redis Enterprise servers with Metricbeat.',
      }
    ),
    longDescription: _i18n.i18n.translate('home.tutorials.redisenterpriseMetrics.longDescription', {
      defaultMessage:
        'The `redisenterprise` Metricbeat module fetches metrics from Redis Enterprise Server \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-redisenterprise.html',
      },
    }),
    euiIconType: 'logoRedis',
    isBeta: true,
    artifacts: {
      application: {
        label: _i18n.i18n.translate(
          'home.tutorials.redisenterpriseMetrics.artifacts.application.label',
          {
            defaultMessage: 'Discover',
          }
        ),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-redisenterprise.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/redisenterprise_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore', 'message_queue'],
  };
}
