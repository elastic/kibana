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

export function corednsLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'coredns';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'corednsLogs',
    name: i18n.translate('home.tutorials.corednsLogs.nameTitle', {
      defaultMessage: 'CoreDNS Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.corednsLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from CoreDNS servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.corednsLogs.longDescription', {
      defaultMessage:
        'This is a filebeat module for CoreDNS. It supports both standalone CoreDNS deployment and CoreDNS deployment in Kubernetes. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-coredns.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/coredns.svg',
    artifacts: {
      dashboards: [
        {
          id: '53aa1f70-443e-11e9-8548-ab7fbe04f038',
          linkLabel: i18n.translate('home.tutorials.corednsLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: '[Filebeat CoreDNS] Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-coredns.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/coredns_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'network', 'web'],
  };
}
