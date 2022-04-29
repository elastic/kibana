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
exports.systemMetricsSpecProvider = systemMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function systemMetricsSpecProvider(context) {
  const moduleName = 'system';
  return {
    id: 'systemMetrics',
    name: _i18n.i18n.translate('home.tutorials.systemMetrics.nameTitle', {
      defaultMessage: 'System Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.systemMetrics.shortDescription', {
      defaultMessage:
        'Collect CPU, memory, network, and disk metrics from System hosts with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.systemMetrics.longDescription', {
      defaultMessage:
        'The `system` Metricbeat module collects CPU, memory, network, and disk statistics from host. \
It collects system wide statistics and statistics per process and filesystem. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-system.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/system.svg',
    artifacts: {
      dashboards: [
        {
          id: 'Metricbeat-system-overview-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.systemMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'System metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-system.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/system_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['os_system', 'security'],
  };
}
