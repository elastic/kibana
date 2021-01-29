/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TutorialsCategory, TutorialSchema } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/metricbeat_instructions';
import { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';

export function traefikMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'traefik';
  return {
    id: 'traefikMetrics',
    name: i18n.translate('home.tutorials.traefikMetrics.nameTitle', {
      defaultMessage: 'Traefik metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.traefikMetrics.shortDescription', {
      defaultMessage: 'Fetch monitoring metrics from Traefik.',
    }),
    longDescription: i18n.translate('home.tutorials.traefikMetrics.longDescription', {
      defaultMessage:
        'The `traefik` Metricbeat module fetches monitoring metrics from Traefik. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-traefik.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/traefik.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-traefik.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
