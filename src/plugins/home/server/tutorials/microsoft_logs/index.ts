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

export function microsoftLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'microsoft';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'microsoftLogs',
    name: i18n.translate('home.tutorials.microsoftLogs.nameTitle', {
      defaultMessage: 'Microsoft Defender ATP logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.microsoftLogs.shortDescription', {
      defaultMessage: 'Collect Microsoft Defender ATP alerts.',
    }),
    longDescription: i18n.translate('home.tutorials.microsoftLogs.longDescription', {
      defaultMessage:
        'Collect Microsoft Defender ATP alerts for use with Elastic Security. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-microsoft.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/microsoft.svg',
    artifacts: {
      dashboards: [
        {
          id: '65402c30-ca6a-11ea-9d4d-9737a63aaa55',
          linkLabel: i18n.translate('home.tutorials.microsoftLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Microsoft ATP Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-microsoft.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/microsoft_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
