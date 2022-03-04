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

export function systemLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'system';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'systemLogs',
    name: i18n.translate('home.tutorials.systemLogs.nameTitle', {
      defaultMessage: 'System Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.systemLogs.shortDescription', {
      defaultMessage: 'Collect system logs of common Unix/Linux based distributions.',
    }),
    longDescription: i18n.translate('home.tutorials.systemLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs created by the system logging service of common Unix/Linux based distributions. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-system.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-syslog-dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.systemLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'System Syslog Dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-system.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['os_system', 'security'],
  };
}
