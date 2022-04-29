"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.auditdLogsSpecProvider = auditdLogsSpecProvider;

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
function auditdLogsSpecProvider(context) {
  const moduleName = 'auditd';
  const platforms = ['DEB', 'RPM'];
  return {
    id: 'auditdLogs',
    name: _i18n.i18n.translate('home.tutorials.auditdLogs.nameTitle', {
      defaultMessage: 'Auditd Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.auditdLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Linux audit daemon with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.auditdLogs.longDescription', {
      defaultMessage: 'The  module collects and parses logs from audit daemon ( `auditd`). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-auditd.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/linux.svg',
    artifacts: {
      dashboards: [{
        id: 'dfbb49f0-0a0f-11e7-8a62-2d05eaaac5cb-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.auditdLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Audit Events'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-auditd.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/auditd_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['os_system']
  };
}