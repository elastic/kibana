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

export function zeekLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'zeek';
  const platforms = ['OSX', 'DEB', 'RPM'] as const;
  return {
    id: 'zeekLogs',
    name: i18n.translate('home.tutorials.zeekLogs.nameTitle', {
      defaultMessage: 'Zeek logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.zeekLogs.shortDescription', {
      defaultMessage: 'Collect the logs created by Zeek/Bro.',
    }),
    longDescription: i18n.translate('home.tutorials.zeekLogs.longDescription', {
      defaultMessage:
        'The `zeek` Filebeat module collects the logs from \
[Zeek](https://www.zeek.org//documentation/index.html). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-zeek.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/zeek.svg',
    artifacts: {
      dashboards: [
        {
          id: '7cbb5410-3700-11e9-aa6d-ff445a78330c',
          linkLabel: i18n.translate('home.tutorials.zeekLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Zeek logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-zeek.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/zeek_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
