"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.oracleMetricsSpecProvider = oracleMetricsSpecProvider;

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
function oracleMetricsSpecProvider(context) {
  const moduleName = 'oracle';
  return {
    id: moduleName + 'Metrics',
    name: _i18n.i18n.translate('home.tutorials.oracleMetrics.nameTitle', {
      defaultMessage: 'oracle Metrics'
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.oracleMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Oracle servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.oracleMetrics.longDescription', {
      defaultMessage: 'The `{moduleName}` Metricbeat module fetches metrics from a Oracle server. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-' + moduleName + '.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/oracle.svg',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.oracleMetrics.artifacts.application.label', {
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
    integrationBrowserCategories: ['security']
  };
}