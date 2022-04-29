"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.postgresqlMetricsSpecProvider = postgresqlMetricsSpecProvider;

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
function postgresqlMetricsSpecProvider(context) {
  const moduleName = 'postgresql';
  return {
    id: 'postgresqlMetrics',
    name: _i18n.i18n.translate('home.tutorials.postgresqlMetrics.nameTitle', {
      defaultMessage: 'PostgreSQL Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    isBeta: false,
    shortDescription: _i18n.i18n.translate('home.tutorials.postgresqlMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from PostgreSQL servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.postgresqlMetrics.longDescription', {
      defaultMessage: 'The `postgresql` Metricbeat module fetches metrics from PostgreSQL server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-postgresql.html'
      }
    }),
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        /*
        {
          id: 'TODO',
          linkLabel: 'PostgreSQL metrics dashboard',
          isOverview: true
        }
        */
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-postgresql.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore']
  };
}