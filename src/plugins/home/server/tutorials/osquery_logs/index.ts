/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      defaultMessage: 'Osquery logs',
    }),
    moduleName,
    category: TutorialsCategory.SECURITY_SOLUTION,
    shortDescription: i18n.translate('home.tutorials.osqueryLogs.shortDescription', {
      defaultMessage: 'Collect osquery logs in JSON format.',
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
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
