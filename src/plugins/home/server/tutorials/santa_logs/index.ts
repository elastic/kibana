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

export function santaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'santa';
  const platforms = ['OSX'] as const;
  return {
    id: 'santaLogs',
    name: i18n.translate('home.tutorials.santaLogs.nameTitle', {
      defaultMessage: 'Google Santa logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.santaLogs.shortDescription', {
      defaultMessage: 'Collect Google Santa logs about process executions on MacOS.',
    }),
    longDescription: i18n.translate('home.tutorials.santaLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs from [Google Santa](https://github.com/google/santa), \
        a security tool for macOS that monitors process executions and can blacklist/whitelist binaries. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-santa.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [
        {
          id: '161855f0-ff6a-11e8-93c5-d5ecd1b3e307-ecs',
          linkLabel: i18n.translate('home.tutorials.santaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Santa Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-santa.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/santa_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
