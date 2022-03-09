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

export function osqueryLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'osquery';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'osqueryLogs',
    name: i18n.translate('home.tutorials.osqueryLogs.nameTitle', {
      defaultMessage: 'Osquery Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.osqueryLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Osquery with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.osqueryLogs.longDescription', {
      defaultMessage:
        'The  module collects and decodes the result logs written by \
        [osqueryd](https://osquery.readthedocs.io/en/latest/introduction/using-osqueryd/) in \
        the JSON format. To set up osqueryd follow the osquery installation instructions for \
        your operating system and configure the `filesystem` logging driver (the default). \
        Make sure UTC timestamps are enabled. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-osquery.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/osquery.svg',
    artifacts: {
      dashboards: [
        {
          id: '69f5ae20-eb02-11e7-8f04-51231daa5b05-ecs',
          linkLabel: i18n.translate('home.tutorials.osqueryLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Osquery Compliance Pack',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-osquery.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security', 'os_system'],
  };
}
