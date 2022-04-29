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
exports.activemqMetricsSpecProvider = activemqMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

const _tutorials_registry_types = require('../../services/tutorials/lib/tutorials_registry_types');

function activemqMetricsSpecProvider(context) {
  const moduleName = 'activemq';
  return {
    id: 'activemqMetrics',
    name: _i18n.i18n.translate('home.tutorials.activemqMetrics.nameTitle', {
      defaultMessage: 'ActiveMQ Metrics',
    }),
    moduleName,
    category: _tutorials_registry_types.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.activemqMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from ActiveMQ instances with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.activemqMetrics.longDescription', {
      defaultMessage:
        'The `activemq` Metricbeat module fetches metrics from ActiveMQ instances \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-activemq.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/activemq.svg',
    isBeta: true,
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.activemqMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-activemq.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['web'],
  };
}
