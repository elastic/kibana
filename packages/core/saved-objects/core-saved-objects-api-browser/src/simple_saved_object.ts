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
 */
export interface SimpleSavedObject<T = unknown> {
  attributes: T;
  _version?: SavedObjectType<T>['version'];
  id: SavedObjectType<T>['id'];
  type: SavedObjectType<T>['type'];
  migrationVersion: SavedObjectType<T>['migrationVersion'];
  coreMigrationVersion: SavedObjectType<T>['coreMigrationVersion'];
  error: SavedObjectType<T>['error'];
  references: SavedObjectType<T>['references'];
  updatedAt: SavedObjectType<T>['updated_at'];
  createdAt: SavedObjectType<T>['created_at'];
  /**
   * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
   * `namespaceType: 'agnostic'`.
   */
  namespaces: SavedObjectType<T>['namespaces'];

  get(key: string): any;

  set(key: string, value: any): T;

  has(key: string): boolean;

  save(): Promise<SimpleSavedObject<T>>;

  delete(): Promise<{}>;
}
