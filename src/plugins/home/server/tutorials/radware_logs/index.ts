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

export function radwareLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'radware';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'radwareLogs',
    name: i18n.translate('home.tutorials.radwareLogs.nameTitle', {
      defaultMessage: 'Radware DefensePro logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.radwareLogs.shortDescription', {
      defaultMessage: 'Collect Radware DefensePro logs over syslog or from a file.',
    }),
    longDescription: i18n.translate('home.tutorials.radwareLogs.longDescription', {
      defaultMessage:
        'This is a module for receiving Radware DefensePro logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-radware.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/radware.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.radwareLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-radware.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
