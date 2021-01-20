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

export function phpfpmMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'php_fpm';
  return {
    id: 'phpfpmMetrics',
    name: i18n.translate('home.tutorials.phpFpmMetrics.nameTitle', {
      defaultMessage: 'PHP-FPM metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    isBeta: false,
    shortDescription: i18n.translate('home.tutorials.phpFpmMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from PHP-FPM.',
    }),
    longDescription: i18n.translate('home.tutorials.phpFpmMetrics.longDescription', {
      defaultMessage:
        'The `php_fpm` Metricbeat module fetches internal metrics from the PHP-FPM server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-php_fpm.html',
      },
    }),
    euiIconType: 'logoPhp',
    artifacts: {
      dashboards: [
        /* {
          id: 'TODO',
          linkLabel: 'PHP-FPM metrics dashboard',
          isOverview: true
        }*/
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-php_fpm.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
