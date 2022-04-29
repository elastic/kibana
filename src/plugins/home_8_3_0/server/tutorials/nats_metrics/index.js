"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.natsMetricsSpecProvider = natsMetricsSpecProvider;

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
function natsMetricsSpecProvider(context) {
  const moduleName = 'nats';
  return {
    id: 'natsMetrics',
    name: _i18n.i18n.translate('home.tutorials.natsMetrics.nameTitle', {
      defaultMessage: 'NATS Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.natsMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from NATS servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.natsMetrics.longDescription', {
      defaultMessage: 'The `nats` Metricbeat module fetches metrics from Nats. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-nats.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/nats.svg',
    artifacts: {
      dashboards: [{
        id: 'Metricbeat-Nats-Dashboard-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.natsMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'NATS metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-nats.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/nats_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['message_queue']
  };
}