"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dockerMetricsSpecProvider = dockerMetricsSpecProvider;

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
function dockerMetricsSpecProvider(context) {
  const moduleName = 'docker';
  return {
    id: 'dockerMetrics',
    name: _i18n.i18n.translate('home.tutorials.dockerMetrics.nameTitle', {
      defaultMessage: 'Docker Metrics'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.dockerMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Docker containers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.dockerMetrics.longDescription', {
      defaultMessage: 'The `docker` Metricbeat module fetches metrics from Docker server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-docker.html'
      }
    }),
    euiIconType: 'logoDocker',
    artifacts: {
      dashboards: [{
        id: 'AV4REOpp5NkDleZmzKkE-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.dockerMetrics.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Docker metrics dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-docker.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/docker_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['containers', 'os_system']
  };
}