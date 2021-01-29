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

export function logstashLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'logstash';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'logstashLogs',
    name: i18n.translate('home.tutorials.logstashLogs.nameTitle', {
      defaultMessage: 'Logstash logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.logstashLogs.shortDescription', {
      defaultMessage: 'Collect Logstash main and slow logs.',
    }),
    longDescription: i18n.translate('home.tutorials.logstashLogs.longDescription', {
      defaultMessage:
        'The modules parse Logstash regular logs and the slow log, it will support the plain text format and the JSON format. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-logstash.html',
      },
    }),
    euiIconType: 'logoLogstash',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-Logstash-Log-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.logstashLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Logstash Logs',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-logstash.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
