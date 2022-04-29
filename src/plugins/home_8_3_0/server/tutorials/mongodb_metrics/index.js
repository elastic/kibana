"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mongodbMetricsSpecProvider = mongodbMetricsSpecProvider;

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
function mongodbMetricsSpecProvider(context) {
  const moduleName = 'mongodb';
  return {
    id: 'mongodbMetrics',
    name: _i18n.i18n.translate('home.tutorials.mongodbMetrics.nameTitle', {
      defaultMessage: 'MongoDB Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.mongodbMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from MongoDB servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mongodbMetrics.longDescription', {
      defaultMessage: 'The `mongodb` Metricbeat module fetches metrics from MongoDB server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-mongodb.html'
      }
    }),
    euiIconType: 'logoMongodb',
    artifacts: {
      dashboards: [{
        id: 'Metricbeat-MongoDB-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.mongodbMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'MongoDB metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mongodb.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mongodb_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore']
  };
}