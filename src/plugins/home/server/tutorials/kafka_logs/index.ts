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

export function kafkaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'kafka';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'kafkaLogs',
    name: i18n.translate('home.tutorials.kafkaLogs.nameTitle', {
      defaultMessage: 'Kafka logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.kafkaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs created by Kafka.',
    }),
    longDescription: i18n.translate('home.tutorials.kafkaLogs.longDescription', {
      defaultMessage:
        'The `kafka` Filebeat module parses logs created by Kafka. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-kafka.html',
      },
    }),
    euiIconType: 'logoKafka',
    artifacts: {
      dashboards: [
        {
          id: '943caca0-87ee-11e7-ad9c-db80de0bf8d3-ecs',
          linkLabel: i18n.translate('home.tutorials.kafkaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Kafka logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-kafka.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/kafka_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
