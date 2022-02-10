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

export function apacheLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'apache';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'apacheLogs',
    name: i18n.translate('home.tutorials.apacheLogs.nameTitle', {
      defaultMessage: 'Apache HTTP Server Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.apacheLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Apache HTTP servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.apacheLogs.longDescription', {
      defaultMessage:
        'The apache Filebeat module parses access and error logs created by the Apache HTTP server. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-apache.html',
      },
    }),
    euiIconType: 'logoApache',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-Apache-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.apacheLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Apache logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-apache.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/apache_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['web'],
  };
}
