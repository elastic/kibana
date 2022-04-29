"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.haproxyLogsSpecProvider = haproxyLogsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _filebeat_instructions = require("../instructions/filebeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function haproxyLogsSpecProvider(context) {
  const moduleName = 'haproxy';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'haproxyLogs',
    name: _i18n.i18n.translate('home.tutorials.haproxyLogs.nameTitle', {
      defaultMessage: 'HAProxy Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.haproxyLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from HAProxy servers with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.haproxyLogs.longDescription', {
      defaultMessage: 'The  module collects and parses logs from a ( `haproxy`) process. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-haproxy.html'
      }
    }),
    euiIconType: 'logoHAproxy',
    artifacts: {
      dashboards: [{
        id: '3560d580-aa34-11e8-9c06-877f0445e3e0-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.haproxyLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'HAProxy Overview'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-haproxy.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/haproxy_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'web']
  };
}