"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.azureLogsSpecProvider = azureLogsSpecProvider;

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
function azureLogsSpecProvider(context) {
  const moduleName = 'azure';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'azureLogs',
    name: _i18n.i18n.translate('home.tutorials.azureLogs.nameTitle', {
      defaultMessage: 'Azure Logs'
    }),
    moduleName,
    isBeta: true,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.azureLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Azure with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.azureLogs.longDescription', {
      defaultMessage: 'The `azure` Filebeat module collects Azure activity and audit related logs. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-azure.html'
      }
    }),
    euiIconType: 'logoAzure',
    artifacts: {
      dashboards: [{
        id: '41e84340-ec20-11e9-90ec-112a988266d5',
        linkLabel: _i18n.i18n.translate('home.tutorials.azureLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Azure logs dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-azure.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/azure_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['azure', 'cloud', 'network', 'security']
  };
}