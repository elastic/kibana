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

export function muninMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'munin';
  return {
    id: 'muninMetrics',
    name: i18n.translate('home.tutorials.muninMetrics.nameTitle', {
      defaultMessage: 'Munin metrics',
    }),
    moduleName,
    euiIconType: '/plugins/home/assets/logos/munin.svg',
    isBeta: true,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.muninMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from the Munin server.',
    }),
    longDescription: i18n.translate('home.tutorials.muninMetrics.longDescription', {
      defaultMessage:
        'The `munin` Metricbeat module fetches internal metrics from Munin. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-munin.html',
      },
    }),
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.muninMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-munin.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
