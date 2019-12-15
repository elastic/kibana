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
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../../../common/tutorials/winlogbeat_instructions';

export function windowsEventLogsSpecProvider(context) {
  return {
    id: 'windowsEventLogs',
    name: i18n.translate('kbn.server.tutorials.windowsEventLogs.nameTitle', {
      defaultMessage: 'Windows Event Log',
    }),
    isBeta: false,
    category: TUTORIAL_CATEGORY.SIEM,
    shortDescription: i18n.translate('kbn.server.tutorials.windowsEventLogs.shortDescription', {
      defaultMessage: 'Fetch logs from the Windows Event Log.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.windowsEventLogs.longDescription', {
      defaultMessage:
        'Use Winlogbeat to collect the logs from the Windows Event Log. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.winlogbeat}/index.html',
      },
    }),
    euiIconType: 'logoWindows',
    artifacts: {
      application: {
        label: i18n.translate('kbn.server.tutorials.windowsEventLogs.artifacts.application.label', {
          defaultMessage: 'SIEM App',
        }),
        path: '/app/siem',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.winlogbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(null, null, null, context),
    elasticCloud: cloudInstructions(),
    onPremElasticCloud: onPremCloudInstructions(),
  };
}
