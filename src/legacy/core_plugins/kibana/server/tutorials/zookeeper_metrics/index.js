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

export function zookeeperMetricsSpecProvider(context) {
  const moduleName = 'zookeeper';
  return {
    id: moduleName + 'Metrics',
    name: i18n.translate('kbn.server.tutorials.zookeeperMetrics.nameTitle', {
      defaultMessage: 'Zookeeper metrics',
    }),
    isBeta: false,
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: i18n.translate('kbn.server.tutorials.zookeeperMetrics.shortDescription', {
      defaultMessage: 'Fetch internal metrics from a Zookeeper server.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.zookeeperMetrics.longDescription', {
      defaultMessage: 'The `{moduleName}` Metricbeat module fetches internal metrics from a Zookeeper server. \
[Learn more]({learnMoreLink}).',
      values: {
        moduleName,
        learnMoreLink: '{config.docs.beats.metricbeat}/metricbeat-module-' + moduleName + '.html',
      },
    }),
    artifacts: {
      application: {
        label: i18n.translate('kbn.server.tutorials.zookeeperMetrics.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/kibana#/discover'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-' + moduleName + '.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, null, null, null, context),
    elasticCloud: cloudInstructions(moduleName),
    onPremElasticCloud: onPremCloudInstructions(moduleName)
  };
}
