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
import { SavedObjectMigrationFn, SavedObjectsType } from 'kibana/server';
import { flow } from 'lodash';
import { migrateLegacyKibanaAppShortUrls } from './kibana_app_migration';

export const url: SavedObjectsType = {
  name: 'url',
  namespaceType: 'single',
  hidden: false,
  management: {
    icon: 'link',
    defaultSearchField: 'url',
    importableAndExportable: true,
    getTitle(obj) {
      return `/goto/${encodeURIComponent(obj.id)}`;
    },
  },
  migrations: {
    '7.9.0': flow<SavedObjectMigrationFn>(migrateLegacyKibanaAppShortUrls),
  },
  mappings: {
    properties: {
      accessCount: {
        type: 'long',
      },
      accessDate: {
        type: 'date',
      },
      createDate: {
        type: 'date',
      },
      url: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
    },
  },
};
