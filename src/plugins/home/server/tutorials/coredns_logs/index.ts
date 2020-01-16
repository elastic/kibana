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

export function corednsLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'coredns';
  const platforms = ['OSX', 'DEB', 'RPM'] as const;
  return {
    id: 'corednsLogs',
    name: i18n.translate('home.tutorials.corednsLogs.nameTitle', {
      defaultMessage: 'CoreDNS logs',
    }),
    category: TutorialsCategory.SIEM,
    shortDescription: i18n.translate('home.tutorials.corednsLogs.shortDescription', {
      defaultMessage: 'Collect the logs created by Coredns.',
    }),
    longDescription: i18n.translate('home.tutorials.corednsLogs.longDescription', {
      defaultMessage:
        'The `coredns` Filebeat module collects the logs from \
[CoreDNS](https://coredns.io/manual/toc/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-coredns.html',
      },
    }),
    euiIconType: '/plugins/kibana/home/tutorial_resources/logos/coredns.svg',
    artifacts: {
      dashboards: [
        {
          id: '53aa1f70-443e-11e9-8548-ab7fbe04f038',
          linkLabel: i18n.translate('home.tutorials.corednsLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'CoreDNS logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-coredns.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/coredns_logs/screenshot.jpg',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
