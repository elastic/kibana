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

export function muninMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'munin';
  return {
    id: 'muninMetrics',
    name: i18n.translate('home.tutorials.muninMetrics.nameTitle', {
      defaultMessage: 'Munin Metrics',
    }),
    moduleName,
    euiIconType: '/plugins/home/assets/logos/munin.svg',
    isBeta: true,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.muninMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from Munin servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.muninMetrics.longDescription', {
      defaultMessage:
        'The `munin` Metricbeat module fetches metrics from Munin. \
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
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['datastore'],
  };
}
