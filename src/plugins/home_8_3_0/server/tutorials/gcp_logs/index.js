"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.gcpLogsSpecProvider = gcpLogsSpecProvider;

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
function gcpLogsSpecProvider(context) {
  const moduleName = 'gcp';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'gcpLogs',
    name: _i18n.i18n.translate('home.tutorials.gcpLogs.nameTitle', {
      defaultMessage: 'Google Cloud Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.gcpLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Google Cloud Platform with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.gcpLogs.longDescription', {
      defaultMessage: 'This is a module for Google Cloud logs. It supports reading audit, VPC flow, \
        and firewall logs that have been exported from Stackdriver to a Google Pub/Sub \
        topic sink. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-gcp.html'
      }
    }),
    euiIconType: 'logoGoogleG',
    artifacts: {
      dashboards: [{
        id: '6576c480-73a2-11ea-a345-f985c61fe654',
        linkLabel: _i18n.i18n.translate('home.tutorials.gcpLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Audit Logs Dashbaord'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-gcp.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/gcp_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['google_cloud', 'cloud', 'network', 'security']
  };
}