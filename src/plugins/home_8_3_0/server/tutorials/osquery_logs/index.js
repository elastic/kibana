"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.osqueryLogsSpecProvider = osqueryLogsSpecProvider;

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
function osqueryLogsSpecProvider(context) {
  const moduleName = 'osquery';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'osqueryLogs',
    name: _i18n.i18n.translate('home.tutorials.osqueryLogs.nameTitle', {
      defaultMessage: 'Osquery Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.osqueryLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Osquery with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.osqueryLogs.longDescription', {
      defaultMessage: 'The  module collects and decodes the result logs written by \
        [osqueryd](https://osquery.readthedocs.io/en/latest/introduction/using-osqueryd/) in \
        the JSON format. To set up osqueryd follow the osquery installation instructions for \
        your operating system and configure the `filesystem` logging driver (the default). \
        Make sure UTC timestamps are enabled. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-osquery.html'
      }
    }),
    euiIconType: '/plugins/home/assets/logos/osquery.svg',
    artifacts: {
      dashboards: [{
        id: '69f5ae20-eb02-11e7-8f04-51231daa5b05-ecs',
        linkLabel: _i18n.i18n.translate('home.tutorials.osqueryLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Osquery Compliance Pack'
        }),
        isOverview: true
      }],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-osquery.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'os_system']
  };
}