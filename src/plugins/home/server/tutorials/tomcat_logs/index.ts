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

export function tomcatLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'tomcat';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'tomcatLogs',
    name: i18n.translate('home.tutorials.tomcatLogs.nameTitle', {
      defaultMessage: 'Tomcat logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.tomcatLogs.shortDescription', {
      defaultMessage: 'Collect Apache Tomcat logs over syslog or from a file.',
    }),
    longDescription: i18n.translate('home.tutorials.tomcatLogs.longDescription', {
      defaultMessage:
        'This is a module for receiving Apache Tomcat logs over Syslog or a file. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-tomcat.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/tomcat.svg',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/security',
        label: i18n.translate('home.tutorials.tomcatLogs.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Security App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-tomcat.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
