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
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/filebeat_instructions';

export function iisLogsSpecProvider(context) {
  const moduleName = 'iis';
  const platforms = ['WINDOWS'];
  return {
    id: 'iisLogs',
    name: i18n.translate('kbn.server.tutorials.iisLogs.nameTitle', {
      defaultMessage: 'IIS logs',
    }),
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: i18n.translate('kbn.server.tutorials.iisLogs.shortDescription', {
      defaultMessage: 'Collect and parse access and error logs created by the IIS HTTP server.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.iisLogs.longDescription', {
      defaultMessage: 'The `iis` Filebeat module parses access and error logs created by the IIS HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-iis.html',
      },
    }),
    // euiIconType: 'logoIIS',
    artifacts: {
      dashboards: [
        {
          id: '4278ad30-fe16-11e7-a3b0-d13028918f9f-ecs',
          linkLabel: i18n.translate('kbn.server.tutorials.iisLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'IIS logs dashboard',
          }),
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-iis.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/iis_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}
