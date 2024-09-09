/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export function icingaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'icinga';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'icingaLogs',
    name: i18n.translate('home.tutorials.icingaLogs.nameTitle', {
      defaultMessage: 'Icinga Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.icingaLogs.shortDescription', {
      defaultMessage: 'Collect and parse main, debug, and startup logs from Icinga with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.icingaLogs.longDescription', {
      defaultMessage:
        'The  module parses the main, debug, and startup logs of [Icinga](https://www.icinga.com/products/icinga-2/). \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-icinga.html',
      },
    }),
    euiIconType: context.staticAssets.getPluginAssetHref('/logos/icinga.svg'),
    artifacts: {
      dashboards: [
        {
          id: 'f693d260-2417-11e7-a83b-d5f4cebac9ff-ecs',
          linkLabel: i18n.translate('home.tutorials.icingaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Icinga Main Log',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-icinga.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: context.staticAssets.getPluginAssetHref('/icinga_logs/screenshot.webp'),
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'network'],
  };
}
