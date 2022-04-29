"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.icingaLogsSpecProvider = icingaLogsSpecProvider;

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
function icingaLogsSpecProvider(context) {
  const moduleName = 'icinga';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'icingaLogs',
    name: _i18n.i18n.translate('home.tutorials.icingaLogs.nameTitle', {
      defaultMessage: 'Icinga Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.icingaLogs.shortDescription', {
      defaultMessage: 'Collect and parse main, debug, and startup logs from Icinga with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.icingaLogs.longDescription', {
      defaultMessage: 'The  module parses the main, debug, and startup logs of [Icinga](https://www.icinga.com/products/icinga-2/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-icinga.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/icinga.svg',
    artifacts: {
      dashboards: [{
        id: 'f693d260-2417-11e7-a83b-d5f4cebac9ff-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.icingaLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Icinga Main Log'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-icinga.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/icinga_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['security']
  };
}