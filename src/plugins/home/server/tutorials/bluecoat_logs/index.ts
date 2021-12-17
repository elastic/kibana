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

export function bluecoatLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'bluecoat';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'bluecoatLogs',
    name: i18n.translate('home.tutorials.bluecoatLogs.nameTitle', {
      defaultMessage: 'Bluecoat Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.bluecoatLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Blue Coat Director with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.bluecoatLogs.longDescription', {
      defaultMessage:
        'This is a module for receiving Blue Coat Director logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-bluecoat.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.bluecoatLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-bluecoat.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security'],
  };
}
