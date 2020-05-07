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

import { LegacyManagementSection } from './section';
import { i18n } from '@kbn/i18n';

export const sections = [
  {
    id: 'ingest',
    title: 'Ingest',
  },
  {
    id: 'data',
    title: 'Data',
  },
  {
    id: 'insightsAndAlerting',
    title: 'Insights and Alerting',
  },
  {
    id: 'security',
    title: 'Security',
  },
  {
    id: 'kibana',
    title: 'Kibana',
  },
  {
    id: 'stack',
    title: 'Stack',
  },
];

export class LegacyManagementAdapter {
  main = undefined;
  init = capabilities => {
    this.main = new LegacyManagementSection(
      'management',
      {
        display: i18n.translate('management.displayName', {
          defaultMessage: 'Stack Management',
        }),
      },
      capabilities
    );

    sections.forEach(({ id, title, icon }, idx) => {
      this.main.register(id, {
        display: title,
        order: idx,
        icon,
      });
    });

    return this.main;
  };
  getManagement = () => this.main;
}
