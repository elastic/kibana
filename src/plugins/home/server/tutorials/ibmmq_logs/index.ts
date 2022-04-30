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

export function ibmmqLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'ibmmq';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'ibmmqLogs',
    name: i18n.translate('home.tutorials.ibmmqLogs.nameTitle', {
      defaultMessage: 'IBM MQ Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.ibmmqLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from IBM MQ with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.ibmmqLogs.longDescription', {
      defaultMessage: 'Collect IBM MQ logs with Filebeat. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-ibmmq.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/ibmmq.svg',
    artifacts: {
      dashboards: [
        {
          id: 'ba1d8830-7c7b-11e9-9645-e37efaf5baff',
          linkLabel: i18n.translate('home.tutorials.ibmmqLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'IBM MQ Events',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-ibmmq.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/ibmmq_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security'],
  };
}
