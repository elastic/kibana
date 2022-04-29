"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rabbitmqLogsSpecProvider = rabbitmqLogsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _filebeat_instructions = require("../instructions/filebeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function rabbitmqLogsSpecProvider(context) {
  const moduleName = 'rabbitmq';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'rabbitmqLogs',
    name: _i18n.i18n.translate('home.tutorials.rabbitmqLogs.nameTitle', {
      defaultMessage: 'RabbitMQ Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    shortDescription: _i18n.i18n.translate('home.tutorials.rabbitmqLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from RabbitMQ servers with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.rabbitmqLogs.longDescription', {
      defaultMessage: 'This is the module for parsing [RabbitMQ log files](https://www.rabbitmq.com/logging.html) \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-rabbitmq.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/rabbitmq.svg',
    artifacts: {
      dashboards: [],
      application: {
        label: _i18n.i18n.translate('home.tutorials.rabbitmqLogs.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-rabbitmq.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue']
  };
}