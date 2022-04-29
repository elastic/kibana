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
exports.consulMetricsSpecProvider = consulMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function consulMetricsSpecProvider(context) {
  const moduleName = 'consul';
  return {
    id: 'consulMetrics',
    name: _i18n.i18n.translate('home.tutorials.consulMetrics.nameTitle', {
      defaultMessage: 'Consul Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.consulMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Consul servers with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.consulMetrics.longDescription', {
      defaultMessage:
        'The `consul` Metricbeat module fetches metrics from Consul. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-consul.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/consul.svg',
    artifacts: {
      dashboards: [
        {
          id: '496910f0-b952-11e9-a579-f5c0a5d81340',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.consulMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Consul metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-consul.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/consul_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
