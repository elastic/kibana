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

export function postgresqlMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'postgresql';
  return {
    id: 'postgresqlMetrics',
    name: i18n.translate('home.tutorials.postgresqlMetrics.nameTitle', {
      defaultMessage: 'PostgreSQL Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    isBeta: false,
    shortDescription: i18n.translate('home.tutorials.postgresqlMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from PostgreSQL servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.postgresqlMetrics.longDescription', {
      defaultMessage:
        'The `postgresql` Metricbeat module fetches metrics from PostgreSQL server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-postgresql.html',
      },
    }),
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        /*
        {
          id: 'TODO',
          linkLabel: 'PostgreSQL metrics dashboard',
          isOverview: true
        }
      */
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-postgresql.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['datastore'],
  };
}
