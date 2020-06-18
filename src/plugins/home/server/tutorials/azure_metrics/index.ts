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

export function azureMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'azure';
  return {
    id: 'azureMetrics',
    name: i18n.translate('home.tutorials.azureMetrics.nameTitle', {
      defaultMessage: 'Azure metrics',
    }),
    isBeta: false,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.azureMetrics.shortDescription', {
      defaultMessage: 'Fetch Azure Monitor metrics.',
    }),
    longDescription: i18n.translate('home.tutorials.azureMetrics.longDescription', {
      defaultMessage:
        'The `azure` Metricbeat module fetches Azure Monitor metrics. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-azure.html',
      },
    }),
    euiIconType: 'logoAzure',
    artifacts: {
      dashboards: [
        {
          id: 'eb3f05f0-ea9a-11e9-90ec-112a988266d5',
          linkLabel: i18n.translate('home.tutorials.azureMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Azure metrics dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-azure.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/azure_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
