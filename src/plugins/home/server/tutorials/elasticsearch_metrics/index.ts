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

export function elasticsearchMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'elasticsearch';
  return {
    id: 'elasticsearchMetrics',
    name: i18n.translate('home.tutorials.elasticsearchMetrics.nameTitle', {
      defaultMessage: 'Elasticsearch metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.elasticsearchMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from Elasticsearch.',
    }),
    longDescription: i18n.translate('home.tutorials.elasticsearchMetrics.longDescription', {
      defaultMessage:
        'The `elasticsearch` Metricbeat module fetches internal metrics from Elasticsearch. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-elasticsearch.html',
      },
    }),
    euiIconType: 'logoElasticsearch',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.elasticsearchMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-elasticsearch.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
