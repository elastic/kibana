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

export function corednsMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'coredns';
  return {
    id: 'corednsMetrics',
    name: i18n.translate('home.tutorials.corednsMetrics.nameTitle', {
      defaultMessage: 'CoreDNS Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.corednsMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from CoreDNS servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.corednsMetrics.longDescription', {
      defaultMessage:
        'The `coredns` Metricbeat module fetches metrics from CoreDNS. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-coredns.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/coredns.svg',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.corednsMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-coredns.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/coredns_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
