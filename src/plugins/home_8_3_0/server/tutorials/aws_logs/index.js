"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.awsLogsSpecProvider = awsLogsSpecProvider;

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
function awsLogsSpecProvider(context) {
  const moduleName = 'aws';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'awsLogs',
    name: _i18n.i18n.translate('home.tutorials.awsLogs.nameTitle', {
      defaultMessage: 'AWS S3 based Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.awsLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from AWS S3 buckets with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.awsLogs.longDescription', {
      defaultMessage: 'Collect AWS logs by exporting them to an S3 bucket which is configured with SQS notification. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-aws.html'
      }
    }),
    euiIconType: 'logoAWS',
    artifacts: {
      dashboards: [{
        id: '4746e000-bacd-11e9-9f70-1f7bda85a5eb',
        linkLabel: _i18n.i18n.translate('home.tutorials.awsLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'AWS S3 server access log dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-aws.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/aws_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['aws', 'cloud', 'datastore', 'security', 'network']
  };
}