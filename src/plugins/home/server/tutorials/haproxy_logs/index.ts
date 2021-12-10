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

export function haproxyLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'haproxy';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'haproxyLogs',
    name: i18n.translate('home.tutorials.haproxyLogs.nameTitle', {
      defaultMessage: 'HAProxy Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.haproxyLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from HAProxy servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.haproxyLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs from a ( `haproxy`) process. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-haproxy.html',
      },
    }),
    euiIconType: 'logoHAproxy',
    artifacts: {
      dashboards: [
        {
          id: '3560d580-aa34-11e8-9c06-877f0445e3e0-ecs',
          linkLabel: i18n.translate('home.tutorials.haproxyLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'HAProxy Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-haproxy.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/haproxy_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'web'],
  };
}
