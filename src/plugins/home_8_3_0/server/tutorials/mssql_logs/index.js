"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mssqlLogsSpecProvider = mssqlLogsSpecProvider;

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
function mssqlLogsSpecProvider(context) {
  const moduleName = 'mssql';
  const platforms = ['DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'mssqlLogs',
    name: _i18n.i18n.translate('home.tutorials.mssqlLogs.nameTitle', {
      defaultMessage: 'Microsoft SQL Server Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.mssqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Microsoft SQL Server instances with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mssqlLogs.longDescription', {
      defaultMessage: 'The  module parses error logs created by MSSQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mssql.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/microsoft.svg',
    artifacts: {
      dashboards: [],
      application: {
        label: _i18n.i18n.translate('home.tutorials.mssqlLogs.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mssql.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore']
  };
}