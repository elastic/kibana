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

export function gcpLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'gcp';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'gcpLogs',
    name: i18n.translate('home.tutorials.gcpLogs.nameTitle', {
      defaultMessage: 'Google Cloud Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.gcpLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Google Cloud Platform with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.gcpLogs.longDescription', {
      defaultMessage:
        'This is a module for Google Cloud logs. It supports reading audit, VPC flow, \
        and firewall logs that have been exported from Stackdriver to a Google Pub/Sub \
        topic sink. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-gcp.html',
      },
    }),
    euiIconType: 'logoGoogleG',
    artifacts: {
      dashboards: [
        {
          id: '6576c480-73a2-11ea-a345-f985c61fe654',
          linkLabel: i18n.translate('home.tutorials.gcpLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Audit Logs Dashbaord',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-gcp.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/gcp_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['google_cloud', 'cloud', 'network', 'security'],
  };
}
