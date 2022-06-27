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

export function santaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'santa';
  const platforms = ['OSX'] as const;
  return {
    id: 'santaLogs',
    name: i18n.translate('home.tutorials.santaLogs.nameTitle', {
      defaultMessage: 'Google Santa Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.santaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Google Santa systems with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.santaLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs from [Google Santa](https://github.com/google/santa), \
        a security tool for macOS that monitors process executions and can blacklist/whitelist binaries. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-santa.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [
        {
          id: '161855f0-ff6a-11e8-93c5-d5ecd1b3e307-ecs',
          linkLabel: i18n.translate('home.tutorials.santaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Santa Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-santa.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/santa_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'os_system'],
  };
}
