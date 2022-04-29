"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mongodbLogsSpecProvider = mongodbLogsSpecProvider;

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
function mongodbLogsSpecProvider(context) {
  const moduleName = 'mongodb';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'mongodbLogs',
    name: _i18n.i18n.translate('home.tutorials.mongodbLogs.nameTitle', {
      defaultMessage: 'MongoDB Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.mongodbLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from MongoDB servers with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.mongodbLogs.longDescription', {
      defaultMessage: 'The  module collects and parses logs created by [MongoDB](https://www.mongodb.com/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mongodb.html'
      }
    }),
    euiIconType: 'logoMongodb',
    artifacts: {
      dashboards: [{
        id: 'abcf35b0-0a82-11e8-bffe-ff7d4f68cf94-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.mongodbLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'MongoDB Overview'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mongodb.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mongodb_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore']
  };
}