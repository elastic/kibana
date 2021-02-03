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
} from '../instructions/filebeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function mssqlLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'mssql';
  const platforms = ['DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'mssqlLogs',
    name: i18n.translate('home.tutorials.mssqlLogs.nameTitle', {
      defaultMessage: 'MSSQL logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.mssqlLogs.shortDescription', {
      defaultMessage: 'Collect MSSQL logs.',
    }),
    longDescription: i18n.translate('home.tutorials.mssqlLogs.longDescription', {
      defaultMessage:
        'The  module parses error logs created by MSSQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mssql.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/microsoft.svg',
    artifacts: {
      dashboards: [],
      application: {
        label: i18n.translate('home.tutorials.mssqlLogs.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mssql.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
