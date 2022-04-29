"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sonicwallLogsSpecProvider = sonicwallLogsSpecProvider;

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
function sonicwallLogsSpecProvider(context) {
  const moduleName = 'sonicwall';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'sonicwallLogs',
    name: _i18n.i18n.translate('home.tutorials.sonicwallLogs.nameTitle', {
      defaultMessage: 'Sonicwall FW Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.sonicwallLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Sonicwall-FW with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.sonicwallLogs.longDescription', {
      defaultMessage: 'This is a module for receiving Sonicwall-FW logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-sonicwall.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/sonicwall.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: _i18n.i18n.translate('home.tutorials.radwareLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App'
        })
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-sonicwall.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security']
  };
}