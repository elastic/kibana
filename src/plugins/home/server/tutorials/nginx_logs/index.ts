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

export function nginxLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'nginx';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'nginxLogs',
    name: i18n.translate('home.tutorials.nginxLogs.nameTitle', {
      defaultMessage: 'Nginx Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.nginxLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Nginx HTTP servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.nginxLogs.longDescription', {
      defaultMessage:
        'The `nginx` Filebeat module parses access and error logs created by the Nginx HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-nginx.html',
      },
    }),
    euiIconType: 'logoNginx',
    artifacts: {
      dashboards: [
        {
          id: '55a9e6e0-a29e-11e7-928f-5dbe6f6f5519-ecs',
          linkLabel: i18n.translate('home.tutorials.nginxLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Nginx logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-nginx.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/nginx_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['web', 'security'],
  };
}
