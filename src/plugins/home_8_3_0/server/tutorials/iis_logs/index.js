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
exports.iisLogsSpecProvider = iisLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function iisLogsSpecProvider(context) {
  const moduleName = 'iis';
  const platforms = ['WINDOWS'];
  return {
    id: 'iisLogs',
    name: _i18n.i18n.translate('home.tutorials.iisLogs.nameTitle', {
      defaultMessage: 'IIS Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.iisLogs.shortDescription', {
      defaultMessage:
        'Collect and parse access and error logs from IIS HTTP servers with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.iisLogs.longDescription', {
      defaultMessage:
        'The `iis` Filebeat module parses access and error logs created by the IIS HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-iis.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/iis.svg',
    artifacts: {
      dashboards: [
        {
          id: '4278ad30-fe16-11e7-a3b0-d13028918f9f-ecs',
          linkLabel: _i18n.i18n.translate('home.tutorials.iisLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'IIS logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-iis.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/iis_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['web'],
  };
}
