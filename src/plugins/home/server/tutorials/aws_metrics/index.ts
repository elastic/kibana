/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      defaultMessage: 'AWS metrics',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.awsMetrics.shortDescription', {
      defaultMessage:
        'Fetch monitoring metrics for EC2 instances from the AWS APIs and Cloudwatch.',
    }),
    longDescription: i18n.translate('home.tutorials.awsMetrics.longDescription', {
      defaultMessage:
        'The `aws` Metricbeat module fetches monitoring metrics from the AWS APIs and Cloudwatch. \
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
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
