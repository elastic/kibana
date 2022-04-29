"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cefLogsSpecProvider = cefLogsSpecProvider;

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
function cefLogsSpecProvider(context) {
  const moduleName = 'cef';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'cefLogs',
    name: _i18n.i18n.translate('home.tutorials.cefLogs.nameTitle', {
      defaultMessage: 'CEF Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.cefLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Common Event Format (CEF) with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.cefLogs.longDescription', {
      defaultMessage: 'This is a module for receiving Common Event Format (CEF) data over \
        Syslog. When messages are received over the syslog protocol the syslog \
        input will parse the header and set the timestamp value. Then the \
        processor is applied to parse the CEF encoded data. The decoded data \
        is written into a `cef` object field. Lastly any Elastic Common Schema \
        (ECS) fields that can be populated with the CEF data are populated. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-cef.html'
      }
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [{
        id: 'dd0bc9af-2e89-4150-9b42-62517ea56b71',
        linkLabel: _i18n.i18n.translate('home.tutorials.cefLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'CEF Network Overview Dashboard'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-cef.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security']
  };
}