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
exports.postgresqlLogsSpecProvider = postgresqlLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function postgresqlLogsSpecProvider(context) {
  const moduleName = 'postgresql';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'postgresqlLogs',
    name: _i18n.i18n.translate('home.tutorials.postgresqlLogs.nameTitle', {
      defaultMessage: 'PostgreSQL Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.postgresqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from PostgreSQL servers with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.postgresqlLogs.longDescription', {
      defaultMessage:
        'The `postgresql` Filebeat module parses error and slow logs created by PostgreSQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-postgresql.html',
      },
    }),
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        {
          id: '158be870-87f4-11e7-ad9c-db80de0bf8d3-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.postgresqlLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'PostgreSQL logs dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-postgresql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/postgresql_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['datastore'],
  };
}
