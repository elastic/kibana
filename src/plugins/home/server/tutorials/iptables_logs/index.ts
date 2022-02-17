/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'iptablesLogs',
    name: i18n.translate('home.tutorials.iptablesLogs.nameTitle', {
      defaultMessage: 'Iptables Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.iptablesLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from iptables and ip6tables with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.iptablesLogs.longDescription', {
      defaultMessage:
        'This is a module for iptables and ip6tables logs. It parses logs received \
        over the network via syslog or from a file. Also, it understands the prefix \
        added by some Ubiquiti firewalls, which includes the rule set name, rule \
        number and the action performed on the traffic (allow/deny). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-iptables.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/linux.svg',
    artifacts: {
      dashboards: [
        {
          id: 'ceefb9e0-1f51-11e9-93ed-f7e068f4aebb-ecs',
          linkLabel: i18n.translate('home.tutorials.iptablesLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Iptables Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-iptables.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/iptables_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security'],
  };
}
