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

export function iptablesLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'iptables';
  const platforms = ['DEB', 'RPM'] as const;
  return {
    id: 'iptablesLogs',
    name: i18n.translate('home.tutorials.iptablesLogs.nameTitle', {
      defaultMessage: 'Iptables / Ubiquiti',
    }),
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.iptablesLogs.shortDescription', {
      defaultMessage: 'Collect and parse iptables and ip6tables logs or from Ubiqiti firewalls.',
    }),
    longDescription: i18n.translate('home.tutorials.iptablesLogs.longDescription', {
      defaultMessage:
        'This is a module for iptables and ip6tables logs. It parses logs \
received over the network via syslog or from a file. Also, it understands the \
prefix added by some Ubiquiti firewalls, which includes the rule set name, rule \
number and the action performed on the traffic (allow/deny).. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-iptables.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/ubiquiti.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.iptablesLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-iptables.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/iptables_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
