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

export function auditdLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'auditd';
  const platforms = ['DEB', 'RPM'] as const;
  return {
    id: 'auditdLogs',
    name: i18n.translate('home.tutorials.auditdLogs.nameTitle', {
      defaultMessage: 'Auditd Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.auditdLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Linux audit daemon with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.auditdLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs from audit daemon ( `auditd`). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-auditd.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/linux.svg',
    artifacts: {
      dashboards: [
        {
          id: 'dfbb49f0-0a0f-11e7-8a62-2d05eaaac5cb-ecs',
          linkLabel: i18n.translate('home.tutorials.auditdLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Audit Events',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-auditd.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/auditd_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['os_system'],
  };
}
