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

import { i18n }  from '@kbn/i18n';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/metricbeat_instructions';

export function dockerMetricsSpecProvider() {
  const moduleName = 'docker';
  return {
    id: 'dockerMetrics',
    name: i18n.translate('kbn.server.tutorials.dockerMetrics.nameTitle', {
      defaultMessage: 'Docker metrics',
    }),
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: i18n.translate('kbn.server.tutorials.dockerMetrics.shortDescription', {
      defaultMessage: 'Fetch metrics about your Docker containers.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.dockerMetrics.longDescription', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'The `docker` Metricbeat module fetches metrics from the Docker server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-docker.html',
      },
    }),
    euiIconType: 'logoDocker',
    artifacts: {
      dashboards: [
        {
          id: 'AV4REOpp5NkDleZmzKkE',
          linkLabel: i18n.translate('kbn.server.tutorials.dockerMetrics.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Docker metrics dashboard',
          }),
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-docker.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/docker_metrics/screenshot.png',
    onPrem: onPremInstructions(moduleName),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName)
  };
}
