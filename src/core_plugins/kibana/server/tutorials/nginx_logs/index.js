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

export function nginxLogsSpecProvider() {
  return {
    id: 'nginxLogs',
    name: 'Nginx logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse access and error logs created by the Nginx HTTP server.',
    longDescription: 'The `nginx` Filebeat module parses access and error logs created by the Nginx HTTP server.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-nginx.html).',
    euiIconType: 'logoNginx',
    artifacts: {
      dashboards: [
        {
          id: '55a9e6e0-a29e-11e7-928f-5dbe6f6f5519',
          linkLabel: 'Nginx logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-nginx.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/nginx_logs/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
