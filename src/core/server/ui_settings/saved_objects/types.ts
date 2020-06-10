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

import { SavedObjectReference, SavedObjectsMigrationVersion } from '../../../types';

/**
 * Saved Object base document
 */
interface SavedObjectUiSettings<T = unknown> {
  attributes: T;
  id?: string;
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  version?: string;
  updated_at?: string;
}

interface Referencable {
  references: SavedObjectReference[];
}

/**
 * Describes Saved Object documents from Kibana < 7.0.0 which don't have a
 * `references` root property defined. This type should only be used in
 * migrations.
 *
 * @public
 */
export type SavedObjectUnsanitizedUiSettings<T = unknown> = SavedObjectUiSettings<T> &
  Partial<Referencable>;

/**
 * Describes Saved Object documents that have passed through the migration
 * framework and are guaranteed to have a `references` root property.
 *
 * @public
 */
export type SavedObjectSanitizedUiSettings<T = unknown> = SavedObjectUiSettings<T> & Referencable;
