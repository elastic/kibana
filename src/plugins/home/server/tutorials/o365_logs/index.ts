/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export function o365LogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'o365';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'o365Logs',
    name: i18n.translate('home.tutorials.o365Logs.nameTitle', {
      defaultMessage: 'Office 365 Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.o365Logs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Office 365 with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.o365Logs.longDescription', {
      defaultMessage:
        'This is a module for Office 365 logs received via one of the Office 365 \
        API endpoints. It currently supports user, admin, system, and policy \
        actions and events from Office 365 and Azure AD activity logs exposed \
        by the Office 365 Management Activity API. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-o365.html',
      },
    }),
    euiIconType: context.staticAssets.getPluginAssetHref('/logos/o365.svg'),
    artifacts: {
      dashboards: [
        {
          id: '712e2c00-685d-11ea-8d6a-292ef5d68366',
          linkLabel: i18n.translate('home.tutorials.o365Logs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'O365 Audit Dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-o365.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: context.staticAssets.getPluginAssetHref('/o365_logs/screenshot.webp'),
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'productivity_security'],
  };
}
