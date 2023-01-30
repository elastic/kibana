/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Note: this file contains types that are intended for use by server-side code
 * only. Once the Saved Objects client is removed from browser code we will
 * remove these types as well.
 *
 * See https://github.com/elastic/kibana/issues/149098.
 */

import type { SavedObjectsMigrationVersion, SavedObjectError } from './saved_objects';

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
 * @deprecated This type reduces the type safety of your code. Create an interface for your specific saved object type or use `unknown` instead.
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
 * Definition of the Saved Object interface
 *
 * @public
 */
export interface SavedObject<T = unknown> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** Timestamp of the time this document had been created.  */
  created_at?: string;
  /** Timestamp of the last time this document had been updated.  */
  updated_at?: string;
  /** Error associated with this object, populated if an operation failed for this object.  */
  error?: SavedObjectError;
  /** The data for a Saved Object is stored as an object in the `attributes` property. **/
  attributes: T;
  /** {@inheritdoc SavedObjectReference} */
  references: SavedObjectReference[];
  /** {@inheritdoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /**
   * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
   * `namespaceType: 'agnostic'`.
   */
  namespaces?: string[];
  /**
   * The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
   * from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
   * to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
   * space.
   */
  originId?: string;
}
