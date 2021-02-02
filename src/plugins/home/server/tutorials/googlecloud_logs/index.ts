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

export function googlecloudLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'googlecloud';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'googlecloudLogs',
    name: i18n.translate('home.tutorials.googlecloudLogs.nameTitle', {
      defaultMessage: 'Google Cloud logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.googlecloudLogs.shortDescription', {
      defaultMessage: 'Collect Google Cloud audit, firewall, and VPC flow logs.',
    }),
    longDescription: i18n.translate('home.tutorials.googlecloudLogs.longDescription', {
      defaultMessage:
        'This is a module for Google Cloud logs. It supports reading audit, VPC flow, \
        and firewall logs that have been exported from Stackdriver to a Google Pub/Sub \
        topic sink. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-googlecloud.html',
      },
    }),
    euiIconType: 'logoGoogleG',
    artifacts: {
      dashboards: [
        {
          id: '6576c480-73a2-11ea-a345-f985c61fe654',
          linkLabel: i18n.translate(
            'home.tutorials.googlecloudLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'Audit Logs Dashbaord',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-googlecloud.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/googlecloud_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
