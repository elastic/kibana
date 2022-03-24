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

export function ciscoLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'cisco';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'ciscoLogs',
    name: i18n.translate('home.tutorials.ciscoLogs.nameTitle', {
      defaultMessage: 'Cisco Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.ciscoLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Cisco network devices with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.ciscoLogs.longDescription', {
      defaultMessage:
        'This is a module for Cisco network devices logs (ASA, FTD, IOS, Nexus). It includes the following filesets for receiving logs over syslog or read from a file: \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-cisco.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/cisco.svg',
    artifacts: {
      dashboards: [
        {
          id: 'a555b160-4987-11e9-b8ce-ed898b5ef295',
          linkLabel: i18n.translate('home.tutorials.ciscoLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'ASA Firewall Dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-cisco.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/cisco_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security'],
  };
}
