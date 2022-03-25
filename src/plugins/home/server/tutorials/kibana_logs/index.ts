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

export function kibanaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'kibana';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'kibanaLogs',
    name: i18n.translate('home.tutorials.kibanaLogs.nameTitle', {
      defaultMessage: 'Kibana Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.kibanaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Kibana with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.kibanaLogs.longDescription', {
      defaultMessage: 'This is the Kibana module. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-kibana.html',
      },
    }),
    euiIconType: 'logoKibana',
    artifacts: {
      dashboards: [],
      application: {
        label: i18n.translate('home.tutorials.kibanaLogs.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-kibana.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['message_queue'],
  };
}
