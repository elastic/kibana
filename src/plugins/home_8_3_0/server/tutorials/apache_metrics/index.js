"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.apacheMetricsSpecProvider = apacheMetricsSpecProvider;

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
function apacheMetricsSpecProvider(context) {
  const moduleName = 'apache';
  return {
    id: 'apacheMetrics',
    name: _i18n.i18n.translate('home.tutorials.apacheMetrics.nameTitle', {
      defaultMessage: 'Apache HTTP Server Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.apacheMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Apache HTTP servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.apacheMetrics.longDescription', {
      defaultMessage: 'The `apache` Metricbeat module fetches metrics from Apache 2 HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-apache.html'
      }
    }),
    euiIconType: 'logoApache',
    artifacts: {
      dashboards: [{
        id: 'Metricbeat-Apache-HTTPD-server-status-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.apacheMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Apache metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-apache.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/apache_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['web']
  };
}