/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

export function vSphereMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'vsphere';
  return {
    id: 'vsphereMetrics',
    name: i18n.translate('home.tutorials.vsphereMetrics.nameTitle', {
      defaultMessage: 'vSphere metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.vsphereMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from vSphere.',
    }),
    longDescription: i18n.translate('home.tutorials.vsphereMetrics.longDescription', {
      defaultMessage:
        'The `vsphere` Metricbeat module fetches internal metrics from a vSphere cluster. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-vsphere.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/vsphere.svg',
    isBeta: true,
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.vsphereMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-vsphere.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
