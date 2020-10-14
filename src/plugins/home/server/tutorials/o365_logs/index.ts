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

export function o365LogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'o365';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'o365Logs',
    name: i18n.translate('home.tutorials.o365Logs.nameTitle', {
      defaultMessage: 'Office 365 logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.o365Logs.shortDescription', {
      defaultMessage: 'Collect Office 365 activity logs via the Office 365 API.',
    }),
    longDescription: i18n.translate('home.tutorials.o365Logs.longDescription', {
      defaultMessage:
        'This is a module for Office 365 logs received via one of the Office 365 \
        API endpoints. It currently supports user, admin, system, and policy \
        actions and events from Office 365 and Azure AD activity logs exposed \
        by the Office 365 Management Activity API. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-o365.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/o365.svg',
    artifacts: {
      dashboards: [
        {
          id: '712e2c00-685d-11ea-8d6a-292ef5d68366',
          linkLabel: i18n.translate('home.tutorials.o365Logs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'O365 Audit Dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-o365.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/o365_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
