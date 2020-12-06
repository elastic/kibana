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

export function icingaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'icinga';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'icingaLogs',
    name: i18n.translate('home.tutorials.icingaLogs.nameTitle', {
      defaultMessage: 'Icinga logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.icingaLogs.shortDescription', {
      defaultMessage: 'Collect Icinga main, debug, and startup logs.',
    }),
    longDescription: i18n.translate('home.tutorials.icingaLogs.longDescription', {
      defaultMessage:
        'The  module parses the main, debug, and startup logs of [Icinga](https://www.icinga.com/products/icinga-2/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-icinga.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/icinga.svg',
    artifacts: {
      dashboards: [
        {
          id: 'f693d260-2417-11e7-a83b-d5f4cebac9ff-ecs',
          linkLabel: i18n.translate('home.tutorials.icingaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Icinga Main Log',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-icinga.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/icinga_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
