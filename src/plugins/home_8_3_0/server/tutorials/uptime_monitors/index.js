"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uptimeMonitorsSpecProvider = uptimeMonitorsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _heartbeat_instructions = require("../instructions/heartbeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function uptimeMonitorsSpecProvider(context) {
  const moduleName = 'uptime';
  return {
    id: 'uptimeMonitors',
    name: _i18n.i18n.translate('home.tutorials.uptimeMonitors.nameTitle', {
      defaultMessage: 'Uptime Monitors'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.uptimeMonitors.shortDescription', {
      defaultMessage: 'Monitor availability of the services with Heartbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.uptimeMonitors.longDescription', {
      defaultMessage: 'Monitor services for their availability with active probing. \
        Given a list of URLs, Heartbeat asks the simple question: Are you alive? \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html'
      }
    }),
    euiIconType: 'uptimeApp',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/uptime',
        label: _i18n.i18n.translate('home.tutorials.uptimeMonitors.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Uptime App'
        })
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.heartbeat}/exported-fields.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/uptime_monitors/screenshot.png',
    onPrem: (0, _heartbeat_instructions.onPremInstructions)([], context),
    elasticCloud: (0, _heartbeat_instructions.cloudInstructions)(context),
    onPremElasticCloud: (0, _heartbeat_instructions.onPremCloudInstructions)(context),
    integrationBrowserCategories: ['web', 'security']
  };
}