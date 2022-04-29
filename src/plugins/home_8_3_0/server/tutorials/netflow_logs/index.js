"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.netflowLogsSpecProvider = netflowLogsSpecProvider;

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
function netflowLogsSpecProvider(context) {
  const moduleName = 'netflow';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'netflowLogs',
    name: _i18n.i18n.translate('home.tutorials.netflowLogs.nameTitle', {
      defaultMessage: 'NetFlow / IPFIX Records'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.netflowLogs.shortDescription', {
      defaultMessage: 'Collect records from NetFlow and IPFIX flow with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.netflowLogs.longDescription', {
      defaultMessage: 'This is a module for receiving NetFlow and IPFIX flow records over UDP. This input supports NetFlow versions 1, 5, 6, 7, 8 and 9, as well as IPFIX. For NetFlow versions older than 9, fields are mapped automatically to NetFlow v9. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-netflow.html'
      }
    }),
    euiIconType: 'logoBeats',
    artifacts: {
      dashboards: [{
        id: '34e26884-161a-4448-9556-43b5bf2f62a2',
        linkLabel: _i18n.i18n.translate('home.tutorials.netflowLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Netflow Overview'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-netflow.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security']
  };
}