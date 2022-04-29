"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.redisMetricsSpecProvider = redisMetricsSpecProvider;

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
function redisMetricsSpecProvider(context) {
  const moduleName = 'redis';
  return {
    id: 'redisMetrics',
    name: _i18n.i18n.translate('home.tutorials.redisMetrics.nameTitle', {
      defaultMessage: 'Redis Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.redisMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Redis servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.redisMetrics.longDescription', {
      defaultMessage: 'The `redis` Metricbeat module fetches metrics from Redis server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-redis.html'
      }
    }),
    euiIconType: 'logoRedis',
    artifacts: {
      dashboards: [{
        id: 'AV4YjZ5pux-M-tCAunxK-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.redisMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Redis metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-redis.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/redis_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['datastore', 'message_queue']
  };
}