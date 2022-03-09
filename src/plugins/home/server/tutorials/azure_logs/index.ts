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

export function azureLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'azure';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'azureLogs',
    name: i18n.translate('home.tutorials.azureLogs.nameTitle', {
      defaultMessage: 'Azure Logs',
    }),
    moduleName,
    isBeta: true,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.azureLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Azure with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.azureLogs.longDescription', {
      defaultMessage:
        'The `azure` Filebeat module collects Azure activity and audit related logs. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-azure.html',
      },
    }),
    euiIconType: 'logoAzure',
    artifacts: {
      dashboards: [
        {
          id: '41e84340-ec20-11e9-90ec-112a988266d5',
          linkLabel: i18n.translate('home.tutorials.azureLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Azure logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-azure.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/azure_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['azure', 'cloud', 'network', 'security'],
  };
}
