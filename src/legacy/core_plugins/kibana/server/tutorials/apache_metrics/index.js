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
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../../../common/tutorials/metricbeat_instructions';

export function apacheMetricsSpecProvider(server, context) {
  const moduleName = 'apache';
  return {
    id: 'apacheMetrics',
    name: i18n.translate('kbn.server.tutorials.apacheMetrics.nameTitle', {
      defaultMessage: 'Apache metrics',
    }),
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: i18n.translate('kbn.server.tutorials.apacheMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from the Apache 2 HTTP server.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.apacheMetrics.longDescription', {
      defaultMessage:
        'The `apache` Metricbeat module fetches internal metrics from the Apache 2 HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-apache.html',
      },
    }),
    euiIconType: 'logoApache',
    artifacts: {
      dashboards: [
        {
          id: 'Metricbeat-Apache-HTTPD-server-status-ecs',
          linkLabel: i18n.translate(
            'kbn.server.tutorials.apacheMetrics.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Apache metrics dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-apache.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/apache_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName, null, null, null, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
