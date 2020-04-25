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

import { SavedObjectsMigrationVersion, SavedObjectReference } from '../types';

/**
 * A raw document as represented directly in the saved object index.
 *
 * @public
 */
export interface SavedObjectsRawDoc {
  _id: string;
  _source: SavedObjectsRawDocSource;
  _type?: string;
  _seq_no?: number;
  _primary_term?: number;
}

/** @public */
export interface SavedObjectsRawDocSource {
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  updated_at?: string;
  references?: SavedObjectReference[];
  originId?: string;

  [typeMapping: string]: any;
}

/**
 * Saved Object base document
 */
interface SavedObjectDoc<T = unknown> {
  attributes: T;
  id?: string; // NOTE: SavedObjectDoc is used for uncreated objects where `id` is optional
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  version?: string;
  updated_at?: string;
  originId?: string;
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
export type SavedObjectUnsanitizedDoc<T = unknown> = SavedObjectDoc<T> & Partial<Referencable>;

/**
 * Describes Saved Object documents that have passed through the migration
 * framework and are guaranteed to have a `references` root property.
 *
 * @public
 */
export type SavedObjectSanitizedDoc<T = unknown> = SavedObjectDoc<T> & Referencable;
