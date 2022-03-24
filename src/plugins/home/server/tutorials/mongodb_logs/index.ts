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

export function mongodbLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'mongodb';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'mongodbLogs',
    name: i18n.translate('home.tutorials.mongodbLogs.nameTitle', {
      defaultMessage: 'MongoDB Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.mongodbLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from MongoDB servers with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.mongodbLogs.longDescription', {
      defaultMessage:
        'The  module collects and parses logs created by [MongoDB](https://www.mongodb.com/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-mongodb.html',
      },
    }),
    euiIconType: 'logoMongodb',
    artifacts: {
      dashboards: [
        {
          id: 'abcf35b0-0a82-11e8-bffe-ff7d4f68cf94-ecs',
          linkLabel: i18n.translate('home.tutorials.mongodbLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'MongoDB Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mongodb.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/mongodb_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['datastore'],
  };
}
