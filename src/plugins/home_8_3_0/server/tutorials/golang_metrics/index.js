"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.golangMetricsSpecProvider = golangMetricsSpecProvider;

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
function golangMetricsSpecProvider(context) {
  const moduleName = 'golang';
  return {
    id: moduleName + 'Metrics',
    name: _i18n.i18n.translate('home.tutorials.golangMetrics.nameTitle', {
      defaultMessage: 'Golang Metrics'
    }),
    moduleName,
    isBeta: true,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.golangMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Golang applications with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.golangMetrics.longDescription', {
      defaultMessage: 'The `{moduleName}` Metricbeat module fetches metrics from a Golang app. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: `{config.docs.beats.metricbeat}/metricbeat-module-${moduleName}.html`
      }
    }),
    euiIconType: 'logoGolang',
    artifacts: {
      dashboards: [{
        id: 'f2dc7320-f519-11e6-a3c9-9d1f7c42b045-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.golangMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Golang metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-' + moduleName + '.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['google_cloud', 'cloud', 'network', 'security']
  };
}