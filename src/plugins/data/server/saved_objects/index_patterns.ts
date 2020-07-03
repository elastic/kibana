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

import { SavedObjectsType } from 'kibana/server';
import { indexPatternSavedObjectTypeMigrations } from './index_pattern_migrations';

export const indexPatternSavedObjectType: SavedObjectsType = {
  name: 'index-pattern',
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'indexPatternApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/indexPatterns/patterns/${encodeURIComponent(obj.id)}`;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/management/kibana/indexPatterns/patterns/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'management.kibana.indexPatterns',
      };
    },
  },
  mappings: {
    properties: {
      fieldFormatMap: { type: 'text' },
      fields: { type: 'text' },
      intervalName: { type: 'keyword' },
      notExpandable: { type: 'boolean' },
      sourceFilters: { type: 'text' },
      timeFieldName: { type: 'keyword' },
      title: { type: 'text' },
      type: { type: 'keyword' },
      typeMeta: { type: 'keyword' },
    },
  },
  migrations: indexPatternSavedObjectTypeMigrations as any,
};
