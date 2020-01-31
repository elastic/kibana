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

export function dropwizardMetricsSpecProvider(server, context) {
  const moduleName = 'dropwizard';
  return {
    id: 'dropwizardMetrics',
    name: i18n.translate('kbn.server.tutorials.dropwizardMetrics.nameTitle', {
      defaultMessage: 'Dropwizard metrics',
    }),
    isBeta: false,
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: i18n.translate('kbn.server.tutorials.dropwizardMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from Dropwizard Java application.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.dropwizardMetrics.longDescription', {
      defaultMessage:
        'The `dropwizard` Metricbeat module fetches internal metrics from Dropwizard Java Application. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-dropwizard.html',
      },
    }),
    euiIconType: 'logoDropwizard',
    artifacts: {
      application: {
        label: i18n.translate(
          'kbn.server.tutorials.dropwizardMetrics.artifacts.application.label',
          {
            defaultMessage: 'Discover',
          }
        ),
        path: '/app/kibana#/discover',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-dropwizard.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, null, null, null, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName),
  };
}
