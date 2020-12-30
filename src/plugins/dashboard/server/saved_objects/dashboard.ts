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
import {
  createDashboardSavedObjectTypeMigrations,
  DashboardSavedObjectTypeMigrationsDeps,
} from './dashboard_migrations';

export const createDashboardSavedObjectType = ({
  migrationDeps,
}: {
  migrationDeps: DashboardSavedObjectTypeMigrationsDeps;
}): SavedObjectsType => ({
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
      hits: { type: 'integer', index: false, doc_values: false },
      kibanaSavedObjectMeta: {
        properties: { searchSourceJSON: { type: 'text', index: false } },
      },
      optionsJSON: { type: 'text', index: false },
      panelsJSON: { type: 'text', index: false },
      refreshInterval: {
        properties: {
          display: { type: 'keyword', index: false, doc_values: false },
          pause: { type: 'boolean', index: false, doc_values: false },
          section: { type: 'integer', index: false, doc_values: false },
          value: { type: 'integer', index: false, doc_values: false },
        },
      },
      timeFrom: { type: 'keyword', index: false, doc_values: false },
      timeRestore: { type: 'boolean', index: false, doc_values: false },
      timeTo: { type: 'keyword', index: false, doc_values: false },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
  migrations: createDashboardSavedObjectTypeMigrations(migrationDeps),
});
