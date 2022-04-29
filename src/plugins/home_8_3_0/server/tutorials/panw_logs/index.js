"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.panwLogsSpecProvider = panwLogsSpecProvider;

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
function panwLogsSpecProvider(context) {
  const moduleName = 'panw';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'panwLogs',
    name: _i18n.i18n.translate('home.tutorials.panwLogs.nameTitle', {
      defaultMessage: 'Palo Alto Networks PAN-OS Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.panwLogs.shortDescription', {
      defaultMessage: 'Collect and parse threat and traffic logs from Palo Alto Networks PAN-OS with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.panwLogs.longDescription', {
      defaultMessage: 'This is a module for Palo Alto Networks PAN-OS firewall monitoring \
        logs received over Syslog or read from a file. It currently supports \
        messages of Traffic and Threat types. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-panw.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/paloalto.svg',
    artifacts: {
      dashboards: [{
        id: 'e40ba240-7572-11e9-976e-65a8f47cc4c1',
        linkLabel: _i18n.i18n.translate('home.tutorials.panwLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'PANW Network Flows'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-panw.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/panw_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['security']
  };
}