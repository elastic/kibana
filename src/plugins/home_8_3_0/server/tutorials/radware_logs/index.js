"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.radwareLogsSpecProvider = radwareLogsSpecProvider;

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
function radwareLogsSpecProvider(context) {
  const moduleName = 'radware';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'radwareLogs',
    name: _i18n.i18n.translate('home.tutorials.radwareLogs.nameTitle', {
      defaultMessage: 'Radware DefensePro Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.radwareLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Radware DefensePro with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.radwareLogs.longDescription', {
      defaultMessage: 'This is a module for receiving Radware DefensePro logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-radware.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/radware.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: _i18n.i18n.translate('home.tutorials.radwareLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App'
        })
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-radware.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['security']
  };
}