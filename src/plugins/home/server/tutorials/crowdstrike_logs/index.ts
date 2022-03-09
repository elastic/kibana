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

export function crowdstrikeLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'crowdstrike';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'crowdstrikeLogs',
    name: i18n.translate('home.tutorials.crowdstrikeLogs.nameTitle', {
      defaultMessage: 'CrowdStrike Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.crowdstrikeLogs.shortDescription', {
      defaultMessage:
        'Collect and parse logs from CrowdStrike Falcon using the Falcon SIEM Connector with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.crowdstrikeLogs.longDescription', {
      defaultMessage:
        'This is the Filebeat module for CrowdStrike Falcon using the Falcon \
        [SIEM Connector](https://www.crowdstrike.com/blog/tech-center/integrate-with-your-siem). \
        This module collects this data, converts it to ECS, and ingests it to view in the SIEM. \
        By default, the Falcon SIEM connector outputs JSON formatted Falcon Streaming API event data. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-crowdstrike.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/crowdstrike.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.crowdstrikeLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-crowdstrike.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['security'],
  };
}
