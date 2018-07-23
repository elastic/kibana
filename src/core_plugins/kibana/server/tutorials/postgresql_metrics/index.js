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

export function postgresqlMetricsSpecProvider() {
  const moduleName = 'postgresql';
  return {
    id: 'postgresqlMetrics',
    name: 'PostgreSQL metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    isBeta: true,
    shortDescription: 'Fetch internal metrics from PostgreSQL.',
    longDescription: 'The `postgresql` Metricbeat module fetches internal metrics from the PostgreSQL server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-postgresql.html).',
    //euiIconType: 'logoPostgreSQL',
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
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-postgresql.html'
      }
    },
    completionTimeMinutes: 10,
    //previewImagePath: '/plugins/kibana/home/tutorial_resources/postgresql_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName)
  };
}
