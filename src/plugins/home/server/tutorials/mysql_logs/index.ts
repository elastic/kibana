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

export function mysqlLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'mysql';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'mysqlLogs',
    name: i18n.translate('home.tutorials.mysqlLogs.nameTitle', {
      defaultMessage: 'MySQL logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.mysqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse error and slow logs created by MySQL.',
    }),
    longDescription: i18n.translate('home.tutorials.mysqlLogs.longDescription', {
      defaultMessage:
        'The `mysql` Filebeat module parses error and slow logs created by MySQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mysql.html',
      },
    }),
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-MySQL-Dashboard-ecs',
          linkLabel: i18n.translate('home.tutorials.mysqlLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'MySQL logs dashboard',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mysql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mysql_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
