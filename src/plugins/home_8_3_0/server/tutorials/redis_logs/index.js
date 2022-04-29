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
exports.redisLogsSpecProvider = redisLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function redisLogsSpecProvider(context) {
  const moduleName = 'redis';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'redisLogs',
    name: _i18n.i18n.translate('home.tutorials.redisLogs.nameTitle', {
      defaultMessage: 'Redis Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.redisLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Redis servers with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.redisLogs.longDescription', {
      defaultMessage:
        'The `redis` Filebeat module parses error and slow logs created by Redis. \
For Redis to write error logs, make sure the `logfile` option, from the \
Redis configuration file, is set to `redis-server.log`. \
The slow logs are read directly from Redis via the `SLOWLOG` command. \
For Redis to record slow logs, make sure the `slowlog-log-slower-than` \
option is set. \
Note that the `slowlog` fileset is experimental. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-redis.html',
      },
    }),
    euiIconType: 'logoRedis',
    artifacts: {
      dashboards: [
        {
          id: '7fea2930-478e-11e7-b1f0-cb29bac6bf8b-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.redisLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Redis logs dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-redis.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/redis_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['datastore', 'message_queue'],
  };
}
