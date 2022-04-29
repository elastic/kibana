"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mysqlLogsSpecProvider = mysqlLogsSpecProvider;

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
function mysqlLogsSpecProvider(context) {
  const moduleName = 'mysql';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'mysqlLogs',
    name: _i18n.i18n.translate('home.tutorials.mysqlLogs.nameTitle', {
      defaultMessage: 'MySQL Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.mysqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from MySQL servers with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mysqlLogs.longDescription', {
      defaultMessage: 'The `mysql` Filebeat module parses error and slow logs created by MySQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mysql.html'
      }
    }),
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [{
        id: 'Filebeat-MySQL-Dashboard-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.mysqlLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'MySQL logs dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mysql.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mysql_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore']
  };
}