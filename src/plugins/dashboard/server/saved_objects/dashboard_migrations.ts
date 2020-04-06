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

import { flow } from 'lodash';

import { SavedObjectMigrationFn } from 'kibana/server';

import { dashboardMigrateMatchAllQuery } from './migrate_match_all_query';
import { dashboardMigrate700 } from './migrations_700';
import { dashboardMigrate730 } from './migrations_730';

export const dashboardSavedObjectTypeMigrations = {
  '6.7.2': flow<SavedObjectMigrationFn>(dashboardMigrateMatchAllQuery),
  '7.0.0': flow<SavedObjectMigrationFn>(dashboardMigrate700),
  '7.3.0': flow<SavedObjectMigrationFn>(dashboardMigrate730),
};
