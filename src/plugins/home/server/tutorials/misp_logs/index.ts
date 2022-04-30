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

export function mispLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'misp';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'mispLogs',
    name: i18n.translate('home.tutorials.mispLogs.nameTitle', {
      defaultMessage: 'MISP threat intel Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.mispLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from MISP threat intelligence with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.mispLogs.longDescription', {
      defaultMessage:
        'This is a filebeat module for reading threat intel information from the MISP platform ( https://www.circl.lu/doc/misp/). It uses the httpjson input to access the MISP REST API interface. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-misp.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/misp.svg',
    artifacts: {
      dashboards: [
        {
          id: 'c6cac9e0-f105-11e9-9a88-690b10c8ee99',
          linkLabel: i18n.translate('home.tutorials.mispLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'MISP Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-misp.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/misp_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security', 'azure'],
  };
}
