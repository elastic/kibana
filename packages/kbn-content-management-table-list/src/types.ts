/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * -------------------------------
 * INFO
 * -------------------------------
 * The types declared here will come from their respective packages
 * onces those are created. For now they have been copied from core and kibana-react.
 */

export interface SavedObject<T = unknown> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** Timestamp of the last time this document had been updated.  */
  updated_at?: string;
  error?: any; // SavedObjectError
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: T;
  /** {@inheritdoc SavedObjectReference} */
  references: any; // SavedObjectReference[]
  /** {@inheritdoc SavedObjectsMigrationVersion} */
  migrationVersion?: any; // SavedObjectsMigrationVersion
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

export interface SimpleSavedObject<T = unknown> {
  attributes: T;
  _version?: SavedObject<T>['version'];
  id: SavedObject<T>['id'];
  type: SavedObject<T>['type'];
  migrationVersion: SavedObject<T>['migrationVersion'];
  coreMigrationVersion: SavedObject<T>['coreMigrationVersion'];
  error: SavedObject<T>['error'];
  references: SavedObject<T>['references'];
  updatedAt?: SavedObject<T>['updated_at'];
  namespaces: SavedObject<T>['namespaces'];
}

export interface SavedObjectsFindOptionsReference {
  type: string;
  id: string;
}

export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => () => void;
