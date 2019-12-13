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

export function systemLogsSpecProvider(context) {
  const moduleName = 'system';
  const platforms = ['OSX', 'DEB', 'RPM'];
  return {
    id: 'systemLogs',
    name: i18n.translate('kbn.server.tutorials.systemLogs.nameTitle', {
      defaultMessage: 'System logs',
    }),
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: i18n.translate('kbn.server.tutorials.systemLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs written by the local Syslog server.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.systemLogs.longDescription', {
      defaultMessage: 'The `system` Filebeat module collects and parses logs created by the system logging service of common \
Unix/Linux based distributions. This module is not available on Windows. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-system.html',
      },
    }),
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-syslog-dashboard-ecs',
          linkLabel: i18n.translate('kbn.server.tutorials.systemLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'System logs dashboard',
          }),
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-system.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/system_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}
