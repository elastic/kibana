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

export function logstashLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'logstash';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'logstashLogs',
    name: i18n.translate('home.tutorials.logstashLogs.nameTitle', {
      defaultMessage: 'Logstash logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.logstashLogs.shortDescription', {
      defaultMessage: 'Collect and parse debug and slow logs created by Logstash itself.',
    }),
    longDescription: i18n.translate('home.tutorials.logstashLogs.longDescription', {
      defaultMessage:
        'The `logstash` Filebeat module parses debug and slow logs created by Logstash itself. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-logstash.html',
      },
    }),
    euiIconType: 'logoLogstash',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-Logstash-Log-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.logstashLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Logstash logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-logstash.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/logstash_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
