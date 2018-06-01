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
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function kubernetesMetricsSpecProvider() {
  return {
    id: 'kubernetesMetrics',
    name: 'Kubernetes metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch metrics from your Kubernetes installation.',
    longDescription: 'The `kubernetes` Metricbeat module fetches metrics from the Kubernetes APIs.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-kubernetes.html).',
    euiIconType: 'logoKubernetes',
    artifacts: {
      dashboards: [
        {
          id: 'AV4RGUqo5NkDleZmzKuZ',
          linkLabel: 'Kubernetes metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-kubernetes.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/kubernetes_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
