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
} from '../instructions/auditbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function auditbeatSpecProvider(context: TutorialContext): TutorialSchema {
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  const moduleName = 'auditbeat';
  return {
    id: 'auditbeat',
    name: i18n.translate('home.tutorials.auditbeat.nameTitle', {
      defaultMessage: 'Auditbeat Events',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.auditbeat.shortDescription', {
      defaultMessage: 'Collect events from your servers with Auditbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.auditbeat.longDescription', {
      defaultMessage:
        'Use Auditbeat to collect auditing data from your hosts. These include \
processes, users, logins, sockets information, file accesses, and more. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.auditbeat}/auditbeat-overview.html',
      },
    }),
    euiIconType: 'securityAnalyticsApp',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.auditbeat.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.auditbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/auditbeat/screenshot.png',
    onPrem: onPremInstructions(platforms, context),
    elasticCloud: cloudInstructions(platforms, context),
    onPremElasticCloud: onPremCloudInstructions(platforms, context),
    integrationBrowserCategories: ['web'],
  };
}
