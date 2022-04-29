/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.crowdstrikeLogsSpecProvider = crowdstrikeLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function crowdstrikeLogsSpecProvider(context) {
  const moduleName = 'crowdstrike';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'crowdstrikeLogs',
    name: _i18n.i18n.translate('home.tutorials.crowdstrikeLogs.nameTitle', {
      defaultMessage: 'CrowdStrike Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.crowdstrikeLogs.shortDescription', {
      defaultMessage:
        'Collect and parse logs from CrowdStrike Falcon using the Falcon SIEM Connector with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.crowdstrikeLogs.longDescription', {
      defaultMessage:
        'This is the Filebeat module for CrowdStrike Falcon using the Falcon \
        [SIEM Connector](https://www.crowdstrike.com/blog/tech-center/integrate-with-your-siem). \
        This module collects this data, converts it to ECS, and ingests it to view in the SIEM. \
        By default, the Falcon SIEM connector outputs JSON formatted Falcon Streaming API event data. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-crowdstrike.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/crowdstrike.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: _i18n.i18n.translate(
          'home.tutorials.crowdstrikeLogs.artifacts.dashboards.linkLabel',
          {
            defaultMessage: 'Security App',
          }
        ),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-crowdstrike.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['security'],
  };
}
