/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/filebeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function redisLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'redis';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'redisLogs',
    name: i18n.translate('home.tutorials.redisLogs.nameTitle', {
      defaultMessage: 'Redis Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.redisLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Redis servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.redisLogs.longDescription', {
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
          linkLabel: i18n.translate('home.tutorials.redisLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Redis logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-redis.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/redis_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore', 'message_queue'],
  };
}
