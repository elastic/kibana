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
exports.kubernetesMetricsSpecProvider = kubernetesMetricsSpecProvider;

const _i18n = require('@kbn/i18n');

const _tutorials = require('../../services/tutorials');

const _metricbeat_instructions = require('../instructions/metricbeat_instructions');

function kubernetesMetricsSpecProvider(context) {
  const moduleName = 'kubernetes';
  return {
    id: 'kubernetesMetrics',
    name: _i18n.i18n.translate('home.tutorials.kubernetesMetrics.nameTitle', {
      defaultMessage: 'Kubernetes Metrics',
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.METRICS,
    shortDescription: _i18n.i18n.translate('home.tutorials.kubernetesMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Kubernetes installations with Metricbeat.',
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.kubernetesMetrics.longDescription', {
      defaultMessage:
        'The `kubernetes` Metricbeat module fetches metrics from Kubernetes APIs. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-kubernetes.html',
      },
    }),
    euiIconType: 'logoKubernetes',
    artifacts: {
      dashboards: [
        {
          id: 'AV4RGUqo5NkDleZmzKuZ-ecs',
          linkLabel: _i18n.i18n.translate(
            'home.tutorials.kubernetesMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Kubernetes metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-kubernetes.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/kubernetes_metrics/screenshot.png',
    onPrem: (0, _metricbeat_instructions.onPremInstructions)(moduleName, context),
    elasticCloud: (0, _metricbeat_instructions.cloudInstructions)(moduleName, context),
    onPremElasticCloud: (0, _metricbeat_instructions.onPremCloudInstructions)(moduleName, context),
    integrationBrowserCategories: ['containers', 'kubernetes'],
  };
}
