/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
import { TutorialsCategory } from '../../services/tutorials/lib/tutorials_registry_types';
import type { TutorialSchema } from '../../services/tutorials/lib/tutorial_schema';
import {
  cloudInstructions,
  onPremCloudInstructions,
  onPremInstructions,
} from '../instructions/filebeat_instructions';

export function bluecoatLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'bluecoat';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'bluecoatLogs',
    name: i18n.translate('home.tutorials.bluecoatLogs.nameTitle', {
      defaultMessage: 'Bluecoat logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.bluecoatLogs.shortDescription', {
      defaultMessage: 'Collect Blue Coat Director logs over syslog or from a file.',
    }),
    longDescription: i18n.translate('home.tutorials.bluecoatLogs.longDescription', {
      defaultMessage:
        'This is a module for receiving Blue Coat Director logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-bluecoat.html',
      },
    }),
    euiIconType: 'logoLogging',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.bluecoatLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-bluecoat.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
