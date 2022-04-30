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

export function dockerMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'docker';
  return {
    id: 'dockerMetrics',
    name: i18n.translate('home.tutorials.dockerMetrics.nameTitle', {
      defaultMessage: 'Docker Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.dockerMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Docker containers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.dockerMetrics.longDescription', {
      defaultMessage:
        'The `docker` Metricbeat module fetches metrics from Docker server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-docker.html',
      },
    }),
    euiIconType: 'logoDocker',
    artifacts: {
      dashboards: [
        {
          id: 'AV4REOpp5NkDleZmzKkE-ecs',
          linkLabel: i18n.translate('home.tutorials.dockerMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Docker metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-docker.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/docker_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['containers', 'os_system'],
  };
}
