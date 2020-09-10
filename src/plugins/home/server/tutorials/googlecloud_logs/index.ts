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
import { TutorialsCategory } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/filebeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function googlecloudLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'googlecloud';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'googlecloudLogs',
    name: i18n.translate('home.tutorials.googlecloudLogs.nameTitle', {
      defaultMessage: 'Google Cloud logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.googlecloudLogs.shortDescription', {
      defaultMessage: 'Collect Google Cloud audit, firewall, and VPC flow logs.',
    }),
    longDescription: i18n.translate('home.tutorials.googlecloudLogs.longDescription', {
      defaultMessage:
        'This is a module for Google Cloud logs. It supports reading audit, VPC flow, \
        and firewall logs that have been exported from Stackdriver to a Google Pub/Sub \
        topic sink. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-googlecloud.html',
      },
    }),
    euiIconType: 'logoGoogleG',
    artifacts: {
      dashboards: [
        {
          id: '6576c480-73a2-11ea-a345-f985c61fe654',
          linkLabel: i18n.translate(
            'home.tutorials.googlecloudLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Audit Logs Dashbaord',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-googlecloud.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/googlecloud_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
