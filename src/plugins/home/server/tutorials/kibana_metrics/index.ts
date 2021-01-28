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

export function kibanaMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'kibana';
  return {
    id: 'kibanaMetrics',
    name: i18n.translate('home.tutorials.kibanaMetrics.nameTitle', {
      defaultMessage: 'Kibana metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.kibanaMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from Kibana.',
    }),
    longDescription: i18n.translate('home.tutorials.kibanaMetrics.longDescription', {
      defaultMessage:
        'The `kibana` Metricbeat module fetches internal metrics from Kibana. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-kibana.html',
      },
    }),
    euiIconType: 'logoKibana',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.kibanaMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-kibana.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
