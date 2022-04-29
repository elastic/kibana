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
exports.statsdMetricsSpecProvider = statsdMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function statsdMetricsSpecProvider(context) {
  const moduleName = 'statsd';
  return {
    id: 'statsdMetrics',
    name: _i18n.i18n.translate('home.tutorials.statsdMetrics.nameTitle', {
      defaultMessage: 'Statsd Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.statsdMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Statsd servers with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.statsdMetrics.longDescription', {
      defaultMessage:
        'The `statsd` Metricbeat module fetches metrics from statsd. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-statsd.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/statsd.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-statsd.html',
      },
    },
    completionTimeMinutes: 10,
    // previewImagePath: '',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['message_queue', 'kubernetes'],
  };
}
