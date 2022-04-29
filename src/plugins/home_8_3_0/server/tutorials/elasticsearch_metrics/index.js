"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elasticsearchMetricsSpecProvider = elasticsearchMetricsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _metricbeat_instructions = require("../instructions/metricbeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function elasticsearchMetricsSpecProvider(context) {
  const moduleName = 'elasticsearch';
  return {
    id: 'elasticsearchMetrics',
    name: _i18n.i18n.translate('home.tutorials.elasticsearchMetrics.nameTitle', {
      defaultMessage: 'Elasticsearch Metrics'
    }),
    moduleName,
    isBeta: false,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.elasticsearchMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Elasticsearch clusters with Metricbeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.elasticsearchMetrics.longDescription', {
      defaultMessage: 'The `elasticsearch` Metricbeat module fetches metrics from Elasticsearch. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-elasticsearch.html'
      }
    }),
    euiIconType: 'logoElasticsearch',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.elasticsearchMetrics.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-elasticsearch.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['elastic_stack', 'datastore']
  };
}