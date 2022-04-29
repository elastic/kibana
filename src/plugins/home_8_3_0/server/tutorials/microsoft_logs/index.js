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
exports.microsoftLogsSpecProvider = microsoftLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function microsoftLogsSpecProvider(context) {
  const moduleName = 'microsoft';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'microsoftLogs',
    name: _i18n.i18n.translate('home.tutorials.microsoftLogs.nameTitle', {
      defaultMessage: 'Microsoft Defender ATP Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.microsoftLogs.shortDescription', {
      defaultMessage: 'Collect and parse alerts from Microsoft Defender ATP with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.microsoftLogs.longDescription', {
      defaultMessage:
        'Collect Microsoft Defender ATP alerts for use with Elastic Security. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-microsoft.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/microsoft.svg',
    artifacts: {
      dashboards: [
        {
          id: '65402c30-ca6a-11ea-9d4d-9737a63aaa55',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.microsoftLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Microsoft ATP Overview',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-microsoft.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/microsoft_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['network', 'security', 'azure'],
  };
}
