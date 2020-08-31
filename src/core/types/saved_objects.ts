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

/**
 * Don't use this type, it's simply a helper type for {@link SavedObjectAttribute}
 *
 * @public
 */
export type SavedObjectAttributeSingle =
  | string
  | number
  | boolean
  | null
  | undefined
  | SavedObjectAttributes;

/**
 * Type definition for a Saved Object attribute value
 *
 * @public
 */
export type SavedObjectAttribute = SavedObjectAttributeSingle | SavedObjectAttributeSingle[];

/**
 * The data for a Saved Object is stored as an object in the `attributes`
 * property.
 *
 * @public
 */
export interface SavedObjectAttributes {
  [key: string]: SavedObjectAttribute;
}

/**
 * A reference to another saved object.
 *
 * @public
 */
export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

/**
 * Information about the migrations that have been applied to this SavedObject.
 * When Kibana starts up, KibanaMigrator detects outdated documents and
 * migrates them based on this value. For each migration that has been applied,
 * the plugin's name is used as a key and the latest migration version as the
 * value.
 *
 * @example
 * migrationVersion: {
 *   dashboard: '7.1.1',
 *   space: '6.6.6',
 * }
 *
 * @public
 */
export interface SavedObjectsMigrationVersion {
  [pluginName: string]: string;
}

export interface SavedObject<T = unknown> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** Timestamp of the last time this document had been updated.  */
  updated_at?: string;
  error?: SavedObjectError;
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: T;
  /** {@inheritdoc SavedObjectReference} */
  references: SavedObjectReference[];
  /** {@inheritdoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /** Namespace(s) that this saved object exists in. This attribute is only used for multi-namespace saved object types. */
  namespaces?: string[];
  /**
   * The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
   * from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
   * to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
   * space.
   */
  originId?: string;
}

export interface SavedObjectError {
  error: string;
  message: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
}
