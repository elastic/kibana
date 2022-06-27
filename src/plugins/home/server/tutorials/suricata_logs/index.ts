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

export function suricataLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'suricata';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'suricataLogs',
    name: i18n.translate('home.tutorials.suricataLogs.nameTitle', {
      defaultMessage: 'Suricata Logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.suricataLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Suricata IDS/IPS/NSM with Filebeat.',
    }),
    longDescription: i18n.translate('home.tutorials.suricataLogs.longDescription', {
      defaultMessage:
        'This is a module to the Suricata IDS/IPS/NSM log. It parses logs that are \
        in the [Suricata Eve JSON format](https://suricata.readthedocs.io/en/latest/output/eve/eve-json-format.html). \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-suricata.html',
      },
    }),
    euiIconType: '/plugins/home/assets/logos/suricata.svg',
    artifacts: {
      dashboards: [
        {
          id: '78289c40-86da-11e8-b59d-21efb914e65c-ecs',
          linkLabel: i18n.translate('home.tutorials.suricataLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'Suricata Events Overview',
          }),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-suricata.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/suricata_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms, context),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms, context),
    integrationBrowserCategories: ['network', 'security'],
  };
}
