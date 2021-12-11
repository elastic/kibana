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
} from '../instructions/winlogbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function windowsEventLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'windows';
  return {
    id: 'windowsEventLogs',
    name: i18n.translate('home.tutorials.windowsEventLogs.nameTitle', {
      defaultMessage: 'Windows Event Logs',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.windowsEventLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Windows Event Logs with WinLogBeat.',
    }),
    longDescription: i18n.translate('home.tutorials.windowsEventLogs.longDescription', {
      defaultMessage:
        'Use Winlogbeat to collect the logs from Windows Event Logs. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.winlogbeat}/index.html',
      },
    }),
    euiIconType: 'logoWindows',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.windowsEventLogs.artifacts.application.label', {
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
    onPrem: onPremInstructions(context),
    elasticCloud: cloudInstructions(context),
    onPremElasticCloud: onPremCloudInstructions(context),
    integrationBrowserCategories: ['os_system', 'security'],
  };
}
