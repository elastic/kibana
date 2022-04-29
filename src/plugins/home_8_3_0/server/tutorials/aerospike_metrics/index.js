"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.aerospikeMetricsSpecProvider = aerospikeMetricsSpecProvider;

var _i18n = require("@kbn/i18n");

var _metricbeat_instructions = require("../instructions/metricbeat_instructions");

var _tutorials_registry_types = require("../../services/tutorials/lib/tutorials_registry_types");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function aerospikeMetricsSpecProvider(context) {
  const moduleName = 'aerospike';
  return {
    id: 'aerospikeMetrics',
    name: _i18n.i18n.translate('home.tutorials.aerospikeMetrics.nameTitle', {
      defaultMessage: 'Aerospike Metrics'
    }),
    moduleName,
    isBeta: false,
    category: _tutorials_registry_types.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.aerospikeMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Aerospike servers with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.aerospikeMetrics.longDescription', {
      defaultMessage: 'The `aerospike` Metricbeat module fetches metrics from Aerospike. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-aerospike.html'
      }
    }),
    euiIconType: 'logoAerospike',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.aerospikeMetrics.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-aerospike.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['web']
  };
}