"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.couchbaseMetricsSpecProvider = couchbaseMetricsSpecProvider;

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
function couchbaseMetricsSpecProvider(context) {
  const moduleName = 'couchbase';
  return {
    id: 'couchbaseMetrics',
    name: _i18n.i18n.translate('home.tutorials.couchbaseMetrics.nameTitle', {
      defaultMessage: 'Couchbase Metrics'
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.couchbaseMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Couchbase databases with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.couchbaseMetrics.longDescription', {
      defaultMessage: 'The `couchbase` Metricbeat module fetches metrics from Couchbase. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-couchbase.html'
      }
    }),
    euiIconType: 'logoCouchbase',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.couchbaseMetrics.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-couchbase.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web']
  };
}