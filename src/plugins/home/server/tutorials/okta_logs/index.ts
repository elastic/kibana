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

export function oktaLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'okta';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'oktaLogs',
    name: i18n.translate('home.tutorials.oktaLogs.nameTitle', {
      defaultMessage: 'Okta Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.oktaLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from the Okta API with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.oktaLogs.longDescription', {
      defaultMessage:
        'The Okta module collects events from the [Okta API](https://developer.okta.com/docs/reference/). \
        Specifically this supports reading from the [Okta System Log API](https://developer.okta.com/docs/reference/api/system-log/). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-okta.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/okta.svg',
    artifacts: {
      dashboards: [
        {
          id: '749203a0-67b1-11ea-a76f-bf44814e437d',
          linkLabel: i18n.translate('home.tutorials.oktaLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Okta Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-okta.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/okta_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security'],
  };
}
