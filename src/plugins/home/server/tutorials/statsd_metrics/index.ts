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

export function statsdMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'statsd';
  return {
    id: 'statsdMetrics',
    name: i18n.translate('home.tutorials.statsdMetrics.nameTitle', {
      defaultMessage: 'Statsd metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.statsdMetrics.shortDescription', {
      defaultMessage: 'Fetch monitoring metrics from statsd.',
    }),
    longDescription: i18n.translate('home.tutorials.statsdMetrics.longDescription', {
      defaultMessage:
        'The `statsd` Metricbeat module fetches monitoring metrics from statsd. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-statsd.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/statsd.svg',
    artifacts: {
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-statsd.html',
      },
    },
    completionTimeMinutes: 10,
    // previewImagePath: '',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
