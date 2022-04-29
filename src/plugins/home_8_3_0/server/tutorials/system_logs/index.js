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
exports.systemLogsSpecProvider = systemLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function systemLogsSpecProvider(context) {
  const moduleName = 'system';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'systemLogs',
    name: _i18n.i18n.translate('home.tutorials.systemLogs.nameTitle', {
      defaultMessage: 'System Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.systemLogs.shortDescription', {
      defaultMessage: 'Collect system logs of common Unix/Linux based distributions.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.systemLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs created by the system logging service of common Unix/Linux based distributions. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-system.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-syslog-dashboard-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.systemLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'System Syslog Dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-system.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['os_system', 'security'],
  };
}
