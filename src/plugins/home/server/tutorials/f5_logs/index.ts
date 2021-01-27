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

export function f5LogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'f5';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'f5Logs',
    name: i18n.translate('home.tutorials.f5Logs.nameTitle', {
      defaultMessage: 'F5 logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.f5Logs.shortDescription', {
      defaultMessage: 'Collect F5 Big-IP Access Policy Manager logs over syslog or from a file.',
    }),
    longDescription: i18n.translate('home.tutorials.f5Logs.longDescription', {
      defaultMessage:
        'This is a module for receiving Big-IP Access Policy Manager logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-f5.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/f5.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.f5Logs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-f5.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/f5_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
