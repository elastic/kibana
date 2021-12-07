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

export function awsMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'aws';
  return {
    id: 'awsMetrics',
    name: i18n.translate('home.tutorials.awsMetrics.nameTitle', {
      defaultMessage: 'AWS Metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.awsMetrics.shortDescription', {
      defaultMessage:
        'Collect metrics for EC2 instances from AWS APIs and Cloudwatch with Metricbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.awsMetrics.longDescription', {
      defaultMessage:
        'The `aws` Metricbeat module fetches metrics from AWS APIs and Cloudwatch. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-aws.html',
      },
    }),
    euiIconType: 'logoAWS',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: 'c5846400-f7fb-11e8-af03-c999c9dea608-ecs',
          linkLabel: i18n.translate('home.tutorials.awsMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'AWS metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-aws.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/aws_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, context),
    integrationBrowserCategories: ['aws', 'cloud', 'datastore', 'security', 'network'],
  };
}
