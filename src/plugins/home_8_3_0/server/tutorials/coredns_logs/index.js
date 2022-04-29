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
exports.corednsLogsSpecProvider = corednsLogsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _filebeat_instructions = require('../instructions/filebeat_instructions');

function corednsLogsSpecProvider(context) {
  const moduleName = 'coredns';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'corednsLogs',
    name: _i18n.i18n.translate('home.tutorials.corednsLogs.nameTitle', {
      defaultMessage: 'CoreDNS Logs',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: _i18n.i18n.translate('home.tutorials.corednsLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from CoreDNS servers with Filebeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.corednsLogs.longDescription', {
      defaultMessage:
        'This is a filebeat module for CoreDNS. It supports both standalone CoreDNS deployment and CoreDNS deployment in Kubernetes. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-coredns.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/coredns.svg',
    artifacts: {
      dashboards: [
        {
          id: '53aa1f70-443e-11e9-8548-ab7fbe04f038',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.corednsLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: '[Filebeat CoreDNS] Overview',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-coredns.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/coredns_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(
      moduleName,
      platforms,
      context
    ),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
