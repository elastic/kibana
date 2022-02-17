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

export function couchdbMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'couchdb';
  return {
    id: 'couchdbMetrics',
    name: i18n.translate('home.tutorials.couchdbMetrics.nameTitle', {
      defaultMessage: 'CouchDB Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.couchdbMetrics.shortDescription', {
      defaultMessage: 'Collect metrics from CouchDB servers with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.couchdbMetrics.longDescription', {
      defaultMessage:
        'The `couchdb` Metricbeat module fetches metrics from CouchDB. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-couchdb.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/couchdb.svg',
    artifacts: {
      dashboards: [
        {
          id: '496910f0-b952-11e9-a579-f5c0a5d81340',
          linkLabel: i18n.translate(
            'home.tutorials.couchdbMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'CouchDB metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-couchdb.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/couchdb_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
