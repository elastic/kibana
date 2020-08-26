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

export function activemqLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'activemq';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'activemqLogs',
    name: i18n.translate('home.tutorials.activemqLogs.nameTitle', {
      defaultMessage: 'ActiveMQ logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.activemqLogs.shortDescription', {
      defaultMessage: 'Collect ActiveMQ logs with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.activemqLogs.longDescription', {
      defaultMessage: 'Collect ActiveMQ logs with Filebeat. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-activemq.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/activemq.svg',
    artifacts: {
      dashboards: [
        {
          id: '26434790-1464-11ea-8fd8-030a13064883',
          linkLabel: i18n.translate('home.tutorials.activemqLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'ActiveMQ Application Events',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-activemq.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/activemq_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
