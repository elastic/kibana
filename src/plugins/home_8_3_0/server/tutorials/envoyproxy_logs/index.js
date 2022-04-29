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
exports.envoyproxyLogsSpecProvider = envoyproxyLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function envoyproxyLogsSpecProvider(context) {
  const moduleName = 'envoyproxy';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'envoyproxyLogs',
    name: _i18n.i18n.translate('home.tutorials.envoyproxyLogs.nameTitle', {
      defaultMessage: 'Envoy Proxy Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.envoyproxyLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Envoy Proxy with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.envoyproxyLogs.longDescription', {
      defaultMessage:
        'This is a Filebeat module for Envoy proxy access log ( https://www.envoyproxy.io/docs/envoy/v1.10.0/configuration/access_log). It supports both standalone deployment and Envoy proxy deployment in Kubernetes. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-envoyproxy.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/envoyproxy.svg',
    artifacts: {
      dashboards: [
        {
          id: '0c610510-5cbd-11e9-8477-077ec9664dbd',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.envoyproxyLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Envoy Proxy Overview',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-envoyproxy.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/envoyproxy_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['elastic_stack', 'datastore'],
  };
}
