/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      defaultMessage: 'Windows Event Log',
    }),
    moduleName,
    isBeta: false,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.windowsEventLogs.shortDescription', {
      defaultMessage: 'Fetch logs from the Windows Event Log.',
    }),
    longDescription: i18n.translate('home.tutorials.windowsEventLogs.longDescription', {
      defaultMessage:
        'Use Winlogbeat to collect the logs from the Windows Event Log. \
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
    elasticCloud: cloudInstructions(),
    onPremElasticCloud: onPremCloudInstructions(),
  };
}
