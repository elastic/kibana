/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.cloudwatchLogsSpecProvider = cloudwatchLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _functionbeat_instructions = require('../instructions/functionbeat_instructions');

function cloudwatchLogsSpecProvider(context) {
  const moduleName = 'aws';
  return {
    id: 'cloudwatchLogs',
    name: _i18n.i18n.translate('home.tutorials.cloudwatchLogs.nameTitle', {
      defaultMessage: 'AWS Cloudwatch Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.cloudwatchLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from AWS Cloudwatch with Functionbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.cloudwatchLogs.longDescription', {
      defaultMessage:
        'Collect Cloudwatch logs by deploying Functionbeat to run as \
        an AWS Lambda function. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink:
          '{config.docs.beats.functionbeat}/functionbeat-installation-configuration.html',
      },
    }),
    euiIconType: 'logoAWS',
    artifacts: {
      dashboards: [
        // TODO
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.functionbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _functionbeat_instructions.onPremInstructions)([], context),
    elasticCloud: (0, _functionbeat_instructions.cloudInstructions)(context),
    onPremElasticCloud: (0, _functionbeat_instructions.onPremCloudInstructions)(context),
    integrationBrowserCategories: ['aws', 'cloud', 'datastore', 'security', 'network'],
  };
}
