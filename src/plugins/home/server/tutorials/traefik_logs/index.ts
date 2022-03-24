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

export function traefikLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'traefik';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'traefikLogs',
    name: i18n.translate('home.tutorials.traefikLogs.nameTitle', {
      defaultMessage: 'Traefik Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.traefikLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Traefik with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.traefikLogs.longDescription', {
      defaultMessage:
        'The  module parses access logs created by [Træfik](https://traefik.io/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-traefik.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/traefik.svg',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-Traefik-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.traefikLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Traefik Access Logs',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-traefik.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['web', 'security'],
  };
}
