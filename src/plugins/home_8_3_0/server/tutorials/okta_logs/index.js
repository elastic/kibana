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
exports.oktaLogsSpecProvider = oktaLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function oktaLogsSpecProvider(context) {
  const moduleName = 'okta';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'oktaLogs',
    name: _i18n.i18n.translate('home.tutorials.oktaLogs.nameTitle', {
      defaultMessage: 'Okta Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.oktaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from the Okta API with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.oktaLogs.longDescription', {
      defaultMessage:
        'The Okta module collects events from the [Okta API](https://developer.okta.com/docs/reference/). \
        Specifically this supports reading from the [Okta System Log API](https://developer.okta.com/docs/reference/api/system-log/). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-okta.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/okta.svg',
    artifacts: {
      dashboards: [
        {
          id: '749203a0-67b1-11ea-a76f-bf44814e437d',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.oktaLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Okta Overview',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-okta.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/okta_logs/screenshot.png',
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
