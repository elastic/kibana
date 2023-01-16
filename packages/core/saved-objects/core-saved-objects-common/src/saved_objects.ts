/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  /** The plugin name and version string */
  [pluginName: string]: string;
}

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

/**
 * The namespace type dictates how a saved object can be interacted in relation to namespaces. Each type is mutually exclusive:
 *  * single (default): This type of saved object is namespace-isolated, e.g., it exists in only one namespace.
 *  * multiple: This type of saved object is shareable, e.g., it can exist in one or more namespaces.
 *  * multiple-isolated: This type of saved object is namespace-isolated, e.g., it exists in only one namespace, but object IDs must be
 *    unique across all namespaces. This is intended to be an intermediate step when objects with a "single" namespace type are being
 *    converted to a "multiple" namespace type. In other words, objects with a "multiple-isolated" namespace type will be *share-capable*,
 *    but will not actually be shareable until the namespace type is changed to "multiple".
 *  * agnostic: This type of saved object is global.
 *
 * @public
 */
export type SavedObjectsNamespaceType = 'single' | 'multiple' | 'multiple-isolated' | 'agnostic';

export interface SavedObjectError {
  error: string;
  message: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
}
