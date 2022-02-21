/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/metricbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function kubernetesMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'kubernetes';
  return {
    id: 'kubernetesMetrics',
    name: i18n.translate('home.tutorials.kubernetesMetrics.nameTitle', {
      defaultMessage: 'Kubernetes Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.kubernetesMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Kubernetes installations with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.kubernetesMetrics.longDescription', {
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
          linkLabel: i18n.translate(
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
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['containers', 'kubernetes'],
  };
}
