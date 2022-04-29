"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ibmmqLogsSpecProvider = ibmmqLogsSpecProvider;

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
function ibmmqLogsSpecProvider(context) {
  const moduleName = 'ibmmq';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'ibmmqLogs',
    name: _i18n.i18n.translate('home.tutorials.ibmmqLogs.nameTitle', {
      defaultMessage: 'IBM MQ Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.ibmmqLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from IBM MQ with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.ibmmqLogs.longDescription', {
      defaultMessage: 'Collect IBM MQ logs with Filebeat. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-ibmmq.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/ibmmq.svg',
    artifacts: {
      dashboards: [{
        id: 'ba1d8830-7c7b-11e9-9645-e37efaf5baff',
        linkLabel: _i18n.i18n.translate('home.tutorials.ibmmqLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'IBM MQ Events'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-ibmmq.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/ibmmq_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['security']
  };
}