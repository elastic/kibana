"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prometheusMetricsSpecProvider = prometheusMetricsSpecProvider;

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
function prometheusMetricsSpecProvider(context) {
  const moduleName = 'prometheus';
  return {
    id: moduleName + 'Metrics',
    name: _i18n.i18n.translate('home.tutorials.prometheusMetrics.nameTitle', {
      defaultMessage: 'Prometheus Metrics'
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.prometheusMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Prometheus exporters with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.prometheusMetrics.longDescription', {
      defaultMessage: 'The `{moduleName}` Metricbeat module fetches metrics from Prometheus endpoint. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-' + moduleName + '.html'
      }
    }),
    euiIconType: 'logoPrometheus',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.prometheusMetrics.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-' + moduleName + '.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['monitoring', 'datastore']
  };
}