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

export class LegacyManagementAdapter {
  main = undefined;
  init = capabilities => {
    this.main = new LegacyManagementSection(
      'management',
      {
        display: i18n.translate('management.displayName', {
          defaultMessage: 'Management',
        }),
      },
      capabilities
    );

    this.main.register('data', {
      display: i18n.translate('management.connectDataDisplayName', {
        defaultMessage: 'Connect Data',
      }),
      order: 0,
    });

    this.main.register('elasticsearch', {
      display: 'Elasticsearch',
      order: 20,
      icon: 'logoElasticsearch',
    });

    this.main.register('kibana', {
      display: 'Kibana',
      order: 30,
      icon: 'logoKibana',
    });

    this.main.register('logstash', {
      display: 'Logstash',
      order: 30,
      icon: 'logoLogstash',
    });

    return this.main;
  };
  getManagement = () => this.main;
}
