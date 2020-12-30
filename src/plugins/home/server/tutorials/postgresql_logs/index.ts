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

export function postgresqlLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'postgresql';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'] as const;
  return {
    id: 'postgresqlLogs',
    name: i18n.translate('home.tutorials.postgresqlLogs.nameTitle', {
      defaultMessage: 'PostgreSQL logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.postgresqlLogs.shortDescription', {
      defaultMessage: 'Collect and parse error and slow logs created by PostgreSQL.',
    }),
    longDescription: i18n.translate('home.tutorials.postgresqlLogs.longDescription', {
      defaultMessage:
        'The `postgresql` Filebeat module parses error and slow logs created by PostgreSQL. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-postgresql.html',
      },
    }),
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        {
          id: '158be870-87f4-11e7-ad9c-db80de0bf8d3-ecs',
          linkLabel: i18n.translate(
            'home.tutorials.postgresqlLogs.artifacts.dashboards.linkLabel',
            {
              defaultMessage: 'PostgreSQL logs dashboard',
            }
          ),
          isOverview: true,
        },
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-postgresql.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/postgresql_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms),
  };
}
