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

export function natsLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'nats';
  const platforms = ['DEB', 'RPM'] as const;
  return {
    id: 'natsLogs',
    name: i18n.translate('home.tutorials.natsLogs.nameTitle', {
      defaultMessage: 'NATS Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    isBeta: true,
    shortDescription: i18n.translate('home.tutorials.natsLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from NATS servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.natsLogs.longDescription', {
      defaultMessage:
        'The `nats` Filebeat module parses logs created by Nats. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-nats.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/nats.svg',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-nats-overview-ecs',
          linkLabel: i18n.translate('home.tutorials.natsLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'NATS logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-nats.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/nats_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue'],
  };
}
