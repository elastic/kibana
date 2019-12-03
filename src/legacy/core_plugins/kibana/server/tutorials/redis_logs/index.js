/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n }  from '@kbn/i18n';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/filebeat_instructions';

export function redisLogsSpecProvider(context) {
  const moduleName = 'redis';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'redisLogs',
    name: i18n.translate('kbn.server.tutorials.redisLogs.nameTitle', {
      defaultMessage: 'Redis logs',
    }),
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: i18n.translate('kbn.server.tutorials.redisLogs.shortDescription', {
      defaultMessage: 'Collect and parse error and slow logs created by Redis.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.redisLogs.longDescription', {
      defaultMessage: 'The `redis` Filebeat module parses error and slow logs created by Redis. \
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
          linkLabel: i18n.translate('kbn.server.tutorials.redisLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Redis logs dashboard',
          }),
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-redis.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/redis_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}
