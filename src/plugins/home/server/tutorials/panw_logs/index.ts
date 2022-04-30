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

export function panwLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'panw';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'panwLogs',
    name: i18n.translate('home.tutorials.panwLogs.nameTitle', {
      defaultMessage: 'Palo Alto Networks PAN-OS Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.panwLogs.shortDescription', {
      defaultMessage:
        'Collect and parse threat and traffic logs from Palo Alto Networks PAN-OS with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.panwLogs.longDescription', {
      defaultMessage:
        'This is a module for Palo Alto Networks PAN-OS firewall monitoring \
        logs received over Syslog or read from a file. It currently supports \
        messages of Traffic and Threat types. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-panw.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/paloalto.svg',
    artifacts: {
      dashboards: [
        {
          id: 'e40ba240-7572-11e9-976e-65a8f47cc4c1',
          linkLabel: i18n.translate('home.tutorials.panwLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'PANW Network Flows',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-panw.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/panw_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security'],
  };
}
