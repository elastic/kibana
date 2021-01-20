/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/metricbeat_instructions';
import {
  TutorialContext,
  TutorialsCategory,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function activemqMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'activemq';
  return {
    id: 'activemqMetrics',
    name: i18n.translate('home.tutorials.activemqMetrics.nameTitle', {
      defaultMessage: 'ActiveMQ metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.activemqMetrics.shortDescription', {
      defaultMessage: 'Fetch monitoring metrics from ActiveMQ instances.',
    }),
    longDescription: i18n.translate('home.tutorials.activemqMetrics.longDescription', {
      defaultMessage:
        'The `activemq` Metricbeat module fetches monitoring metrics from ActiveMQ instances \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-activemq.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/activemq.svg',
    isBeta: true,
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.activemqMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-activemq.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
