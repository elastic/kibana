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

export function microsoftLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'microsoft';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'microsoftLogs',
    name: i18n.translate('home.tutorials.microsoftLogs.nameTitle', {
      defaultMessage: 'Microsoft Defender ATP Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.microsoftLogs.shortDescription', {
      defaultMessage: 'Collect and parse alerts from Microsoft Defender ATP with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.microsoftLogs.longDescription', {
      defaultMessage:
        'Collect Microsoft Defender ATP alerts for use with Elastic Security. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-microsoft.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/microsoft.svg',
    artifacts: {
      dashboards: [
        {
          id: '65402c30-ca6a-11ea-9d4d-9737a63aaa55',
          linkLabel: i18n.translate('home.tutorials.microsoftLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Microsoft ATP Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-microsoft.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/microsoft_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security', 'azure'],
  };
}
