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

export function elasticsearchLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'elasticsearch';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'elasticsearchLogs',
    name: i18n.translate('home.tutorials.elasticsearchLogs.nameTitle', {
      defaultMessage: 'Elasticsearch Logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    isBeta: true,
    shortDescription: i18n.translate('home.tutorials.elasticsearchLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Elasticsearch clusters with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.elasticsearchLogs.longDescription', {
      defaultMessage:
        'The `elasticsearch` Filebeat module parses logs created by Elasticsearch. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-elasticsearch.html',
      },
    }),
    euiIconType: 'logoElasticsearch',
    artifacts: {
      application: {
        label: i18n.translate('home.tutorials.elasticsearchLogs.artifacts.application.label', {
          defaultMessage: 'Discover',
        }),
        path: '/app/discover#/',
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-elasticsearch.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/elasticsearch_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['containers', 'os_system'],
  };
}
