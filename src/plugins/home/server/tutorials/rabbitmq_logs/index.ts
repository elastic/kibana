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

export function rabbitmqLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'rabbitmq';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'rabbitmqLogs',
    name: i18n.translate('home.tutorials.rabbitmqLogs.nameTitle', {
      defaultMessage: 'RabbitMQ Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.rabbitmqLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from RabbitMQ servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.rabbitmqLogs.longDescription', {
      defaultMessage:
        'This is the module for parsing [RabbitMQ log files](https://www.rabbitmq.com/logging.html) \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-rabbitmq.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/rabbitmq.svg',
    artifacts: {
      dashboards: [],
      application: {
        label: i18n.translate('home.tutorials.rabbitmqLogs.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-rabbitmq.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue'],
  };
}
