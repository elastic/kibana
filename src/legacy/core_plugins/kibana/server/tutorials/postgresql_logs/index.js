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

import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/filebeat_instructions';

export function postgresqlLogsSpecProvider() {
  const moduleName = 'postgresql';
  const geoipRequired = false;
  const uaRequired = false;
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'postgresqlLogs',
    name: 'PostgreSQL logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse error and slow logs created by PostgreSQL.',
    longDescription: 'The `postgresql` Filebeat module parses error and slow logs created by PostgreSQL.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-postgresql.html).',
    euiIconType: 'logoPostgres',
    artifacts: {
      dashboards: [
        {
          id: '158be870-87f4-11e7-ad9c-db80de0bf8d3',
          linkLabel: 'PostgreSQL logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-postgresql.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/postgresql_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, geoipRequired, uaRequired),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}
