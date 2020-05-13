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
import { dashboardSavedObjectTypeMigrations } from './dashboard_migrations';

export const dashboardSavedObjectType: SavedObjectsType = {
  name: 'dashboard',
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'dashboardApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/objects/savedDashboards/${encodeURIComponent(obj.id)}`;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/dashboards#/view/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'dashboard.show',
      };
    },
  },
  mappings: {
    properties: {
      description: { type: 'text' },
      hits: { type: 'integer' },
      kibanaSavedObjectMeta: { properties: { searchSourceJSON: { type: 'text' } } },
      optionsJSON: { type: 'text' },
      panelsJSON: { type: 'text' },
      refreshInterval: {
        properties: {
          display: { type: 'keyword' },
          pause: { type: 'boolean' },
          section: { type: 'integer' },
          value: { type: 'integer' },
        },
      },
      timeFrom: { type: 'keyword' },
      timeRestore: { type: 'boolean' },
      timeTo: { type: 'keyword' },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
  migrations: dashboardSavedObjectTypeMigrations,
};
