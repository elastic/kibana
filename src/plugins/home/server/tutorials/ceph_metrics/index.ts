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

export function cephMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'ceph';
  return {
    id: 'cephMetrics',
    name: i18n.translate('home.tutorials.cephMetrics.nameTitle', {
      defaultMessage: 'Ceph metrics',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.cephMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from the Ceph server.',
    }),
    longDescription: i18n.translate('home.tutorials.cephMetrics.longDescription', {
      defaultMessage:
        'The `ceph` Metricbeat module fetches internal metrics from Ceph. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-ceph.html',
      },
    }),
    euiIconType: 'logoCeph',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.cephMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-ceph.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
