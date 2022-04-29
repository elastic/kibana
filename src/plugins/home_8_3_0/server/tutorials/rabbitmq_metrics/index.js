"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rabbitmqMetricsSpecProvider = rabbitmqMetricsSpecProvider;

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
function rabbitmqMetricsSpecProvider(context) {
  const moduleName = 'rabbitmq';
  return {
    id: 'rabbitmqMetrics',
    name: _i18n.i18n.translate('home.tutorials.rabbitmqMetrics.nameTitle', {
      defaultMessage: 'RabbitMQ Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.rabbitmqMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from RabbitMQ servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.rabbitmqMetrics.longDescription', {
      defaultMessage: 'The `rabbitmq` Metricbeat module fetches metrics from RabbitMQ server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-rabbitmq.html'
      }
    }),
    euiIconType: 'logoRabbitmq',
    isBeta: false,
    artifacts: {
      dashboards: [{
        id: 'AV4YobKIge1VCbKU_qVo-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.rabbitmqMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'RabbitMQ metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-rabbitmq.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/rabbitmq_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['message_queue']
  };
}