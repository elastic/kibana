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

export function postgresqlLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'postgresql';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'postgresqlLogs',
    name: i18n.translate('home.tutorials.postgresqlLogs.nameTitle', {
      defaultMessage: 'PostgreSQL Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.postgresqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from PostgreSQL servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.postgresqlLogs.longDescription', {
      defaultMessage:
        'The `postgresql` Filebeat module parses error and slow logs created by PostgreSQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-postgresql.html',
      },
    }),
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        {
          id: '158be870-87f4-11e7-ad9c-db80de0bf8d3-ecs',
          linkLabel: i18n.translate(
            'home.tutorials.postgresqlLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'PostgreSQL logs dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-postgresql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/postgresql_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore'],
  };
}
