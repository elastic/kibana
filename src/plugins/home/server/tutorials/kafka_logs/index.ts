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

export function kafkaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'kafka';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'kafkaLogs',
    name: i18n.translate('home.tutorials.kafkaLogs.nameTitle', {
      defaultMessage: 'Kafka Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.kafkaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Kafka servers with Filebeat.',
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
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue'],
  };
}
