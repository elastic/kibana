"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.suricataLogsSpecProvider = suricataLogsSpecProvider;

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
function suricataLogsSpecProvider(context) {
  const moduleName = 'suricata';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'suricataLogs',
    name: _i18n.i18n.translate('home.tutorials.suricataLogs.nameTitle', {
      defaultMessage: 'Suricata Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.suricataLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Suricata IDS/IPS/NSM with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.suricataLogs.longDescription', {
      defaultMessage: 'This is a module to the Suricata IDS/IPS/NSM log. It parses logs that are \
        in the [Suricata Eve JSON format](https://suricata.readthedocs.io/en/latest/output/eve/eve-json-format.html). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-suricata.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/suricata.svg',
    artifacts: {
      dashboards: [{
        id: '78289c40-86da-11e8-b59d-21efb914e65c-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.suricataLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Suricata Events Overview'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-suricata.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/suricata_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security']
  };
}