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
exports.phpfpmMetricsSpecProvider = phpfpmMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function phpfpmMetricsSpecProvider(context) {
  const moduleName = 'php_fpm';
  return {
    id: 'phpfpmMetrics',
    name: _i18n.i18n.translate('home.tutorials.phpFpmMetrics.nameTitle', {
      defaultMessage: 'PHP-FPM Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    isBeta: false,
    shortDescription: _i18n.i18n.translate('home.tutorials.phpFpmMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from PHP-FPM with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.phpFpmMetrics.longDescription', {
      defaultMessage:
        'The `php_fpm` Metricbeat module fetches metrics from PHP-FPM server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-php_fpm.html',
      },
    }),
    euiIconType: 'logoPhp',
    artifacts: {
      dashboards: [
        /* {
          id: 'TODO',
          linkLabel: 'PHP-FPM metrics dashboard',
          isOverview: true
        }*/
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-php_fpm.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['security'],
  };
}
