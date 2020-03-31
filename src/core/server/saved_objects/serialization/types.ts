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
  migrationVersion?: SavedObjectsMigrationVersion;
  updated_at?: string;
  references?: SavedObjectReference[];

  [typeMapping: string]: any;
}

/**
 * A saved object type definition that allows for miscellaneous, unknown
 * properties, as current discussions around security, ACLs, etc indicate
 * that future props are likely to be added. Migrations support this
 * scenario out of the box.
 */
interface SavedObjectDoc {
  attributes: any;
  id?: string; // NOTE: SavedObjectDoc is used for uncreated objects where `id` is optional
  type: string;
  namespace?: string;
  migrationVersion?: SavedObjectsMigrationVersion;
  version?: string;
  updated_at?: string;

  [rootProp: string]: any;
}

interface Referencable {
  references: SavedObjectReference[];
}

/**
 * We want to have two types, one that guarantees a "references" attribute
 * will exist and one that allows it to be null. Since we're not migrating
 * all the saved objects to have a "references" array, we need to support
 * the scenarios where it may be missing (ex migrations).
 *
 * @public
 */
export type SavedObjectUnsanitizedDoc = SavedObjectDoc & Partial<Referencable>;

/** @public */
export type SavedObjectSanitizedDoc = SavedObjectDoc & Referencable;
