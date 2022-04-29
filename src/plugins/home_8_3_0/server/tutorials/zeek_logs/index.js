"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zeekLogsSpecProvider = zeekLogsSpecProvider;

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
function zeekLogsSpecProvider(context) {
  const moduleName = 'zeek';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'zeekLogs',
    name: _i18n.i18n.translate('home.tutorials.zeekLogs.nameTitle', {
      defaultMessage: 'Zeek Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.zeekLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Zeek network security with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.zeekLogs.longDescription', {
      defaultMessage: 'This is a module for Zeek, which used to be called Bro. It parses logs \
        that are in the [Zeek JSON format](https://www.zeek.org/manual/release/logs/index.html). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-zeek.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/zeek.svg',
    artifacts: {
      dashboards: [{
        id: '7cbb5410-3700-11e9-aa6d-ff445a78330c',
        linkLabel: _i18n.i18n.translate('home.tutorials.zeekLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Zeek Overview'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-zeek.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/zeek_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'monitoring', 'security']
  };
}