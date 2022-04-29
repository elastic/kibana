"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.natsLogsSpecProvider = natsLogsSpecProvider;

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
function natsLogsSpecProvider(context) {
  const moduleName = 'nats';
  const platforms = ['DEB', 'RPM'];
  return {
    id: 'natsLogs',
    name: _i18n.i18n.translate('home.tutorials.natsLogs.nameTitle', {
      defaultMessage: 'NATS Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    isBeta: true,
    shortDescription: _i18n.i18n.translate('home.tutorials.natsLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from NATS servers with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.natsLogs.longDescription', {
      defaultMessage: 'The `nats` Filebeat module parses logs created by Nats. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-nats.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/nats.svg',
    artifacts: {
      dashboards: [{
        id: 'Filebeat-nats-overview-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.natsLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'NATS logs dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-nats.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/nats_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue']
  };
}