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

export function checkpointLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'checkpoint';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'checkpointLogs',
    name: i18n.translate('home.tutorials.checkpointLogs.nameTitle', {
      defaultMessage: 'Check Point Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.checkpointLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Check Point firewalls with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.checkpointLogs.longDescription', {
      defaultMessage:
        'This is a module for Check Point firewall logs. It supports logs from the Log Exporter in the Syslog format. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-checkpoint.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/checkpoint.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.checkpointLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-checkpoint.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security'],
  };
}
