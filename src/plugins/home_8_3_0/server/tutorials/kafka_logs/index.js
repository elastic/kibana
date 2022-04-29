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
exports.kafkaLogsSpecProvider = kafkaLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function kafkaLogsSpecProvider(context) {
  const moduleName = 'kafka';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'kafkaLogs',
    name: _i18n.i18n.translate('home.tutorials.kafkaLogs.nameTitle', {
      defaultMessage: 'Kafka Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.kafkaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Kafka servers with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.kafkaLogs.longDescription', {
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
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.kafkaLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Kafka logs dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-kafka.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/kafka_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['message_queue'],
  };
}
