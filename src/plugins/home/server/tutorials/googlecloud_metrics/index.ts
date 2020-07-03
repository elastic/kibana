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

export function googlecloudMetricsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'googlecloud';
  return {
    id: 'googlecloudMetrics',
    name: i18n.translate('home.tutorials.googlecloudMetrics.nameTitle', {
      defaultMessage: 'Google Cloud metrics',
    }),
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.googlecloudMetrics.shortDescription', {
      defaultMessage:
        'Fetch monitoring metrics from Google Cloud Platform using Stackdriver Monitoring API.',
    }),
    longDescription: i18n.translate('home.tutorials.googlecloudMetrics.longDescription', {
      defaultMessage:
        'The `googlecloud` Metricbeat module fetches monitoring metrics from Google Cloud Platform using Stackdriver Monitoring API. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-googlecloud.html',
      },
    }),
    euiIconType: 'logoGCP',
    isBeta: false,
    artifacts: {
      dashboards: [
        {
          id: 'f40ee870-5e4a-11ea-a4f6-717338406083',
          linkLabel: i18n.translate(
            'home.tutorials.googlecloudMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Google Cloud metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-googlecloud.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/googlecloud_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
