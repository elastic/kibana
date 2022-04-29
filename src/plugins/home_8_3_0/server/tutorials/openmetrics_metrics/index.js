"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.openmetricsMetricsSpecProvider = openmetricsMetricsSpecProvider;

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
function openmetricsMetricsSpecProvider(context) {
  const moduleName = 'openmetrics';
  return {
    id: 'openmetricsMetrics',
    name: _i18n.i18n.translate('home.tutorials.openmetricsMetrics.nameTitle', {
      defaultMessage: 'OpenMetrics Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.openmetricsMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from an endpoint that serves metrics in OpenMetrics format with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.openmetricsMetrics.longDescription', {
      defaultMessage: 'The `openmetrics` Metricbeat module fetches metrics from an endpoint that serves metrics in OpenMetrics format. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-openmetrics.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/openmetrics.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-openmetrics.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['security']
  };
}