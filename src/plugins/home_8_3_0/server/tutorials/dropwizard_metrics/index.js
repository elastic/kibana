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
exports.dropwizardMetricsSpecProvider = dropwizardMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function dropwizardMetricsSpecProvider(context) {
  const moduleName = 'dropwizard';
  return {
    id: 'dropwizardMetrics',
    name: _i18n.i18n.translate('home.tutorials.dropwizardMetrics.nameTitle', {
      defaultMessage: 'Dropwizard Metrics',
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.dropwizardMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Dropwizard Java applciations with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.dropwizardMetrics.longDescription', {
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
        label: _i18n.i18n.translate(
          'home.tutorials.dropwizardMetrics.artifacts.application.label',
          {
            defaultMessage: 'Discover',
          }
        ),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-dropwizard.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['elastic_stack', 'datastore'],
  };
}
