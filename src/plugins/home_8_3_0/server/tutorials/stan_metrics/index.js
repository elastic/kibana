"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stanMetricsSpecProvider = stanMetricsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _metricbeat_instructions = require("../instructions/metricbeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function stanMetricsSpecProvider(context) {
  const moduleName = 'stan';
  return {
    id: 'stanMetrics',
    name: _i18n.i18n.translate('home.tutorials.stanMetrics.nameTitle', {
      defaultMessage: 'STAN Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.stanMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from STAN servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.stanMetrics.longDescription', {
      defaultMessage: 'The `stan` Metricbeat module fetches metrics from STAN. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-stan.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/stan.svg',
    artifacts: {
      dashboards: [{
        id: 'dbf2e220-37ce-11ea-a9c8-152a657da3ab',
        linkLabel: _i18n.i18n.translate('home.tutorials.stanMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Stan metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-stan.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/stan_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['message_queue', 'kubernetes']
  };
}