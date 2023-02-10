/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject as SavedObjectType } from '@kbn/core-saved-objects-common';

/**
 * Very simple wrapper for SavedObjects loaded from the server
 * with the {@link SavedObjectsClientContract}.
 *
 * It provides basic functionality for creating/saving/deleting saved objects,
 * but doesn't include any type-specific implementations.
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SimpleSavedObject<T = unknown> {
  /** attributes of the object, templated */
  attributes: T;
  /**  version of the saved object */
  _version?: SavedObjectType<T>['version'];
  /** ID of the saved object */
  id: SavedObjectType<T>['id'];
  /** Type of the saved object */
  type: SavedObjectType<T>['type'];
  /** Migration version of the saved object */
  migrationVersion: SavedObjectType<T>['migrationVersion'];
  /** Core migration version of the saved object */
  coreMigrationVersion: SavedObjectType<T>['coreMigrationVersion'];
  /** Error associated with this object, undefined if no error */
  error: SavedObjectType<T>['error'];
  /** References to other saved objects  */
  references: SavedObjectType<T>['references'];
  /** The date this object was last updated */
  updatedAt: SavedObjectType<T>['updated_at'];
  /** The date this object was created */
  createdAt: SavedObjectType<T>['created_at'];
  /**
   * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
   * `namespaceType: 'agnostic'`.
   */
  namespaces: SavedObjectType<T>['namespaces'];

  /**
   * Gets an attribute of this object
   *
   * @param {string} key - the name of the attribute
   * @returns The value of the attribute.
   */
  get(key: string): any;

  /**
   * Sets an attribute of this object
   *
   * @param {string} key - the name of the attribute
   * @param {string} value - the value for the attribute
   * @returns The updated attributes of this object.
   */
  set(key: string, value: any): T;

  /**
   * Checks if this object has an attribute
   *
   * @param {string} key - the name of the attribute
   * @returns true if the attribute exists.
   */
  has(key: string): boolean;

  /**
   * Saves this object
   * @deprecated See https://github.com/elastic/kibana/issues/149098
   */
  save(): Promise<SimpleSavedObject<T>>;

  /**
   * Deletes this object
   * @deprecated See https://github.com/elastic/kibana/issues/149098
   */
  delete(): Promise<{}>;
}
