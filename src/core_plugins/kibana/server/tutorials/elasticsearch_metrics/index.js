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

import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/metricbeat_instructions';

export function elasticsearchMetricsSpecProvider() {
  const moduleName = 'elasticsearch';
  return {
    id: 'elasticsearchMetrics',
    name: 'Elasticsearch metrics',
    isBeta: true,
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch internal metrics from Elasticsearch.',
    longDescription: 'The `elasticsearch` Metricbeat module fetches internal metrics from Elasticsearch.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-elasticsearch.html).',
    euiIconType: 'logoElasticsearch',
    artifacts: {
      application: {
        label: 'Discover',
        path: '/app/kibana#/discover'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-elasticsearch.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName)
  };
}
