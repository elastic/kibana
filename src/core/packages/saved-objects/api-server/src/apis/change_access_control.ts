/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { SavedObjectAccessControl, SavedObjectAccessControlEntry } from '../..';
import type { SavedObjectsBaseOptions } from './base';

export interface SavedObjectsChangeAccessControlObject {
  type: string;
  id: string;
}

export interface SavedObjectsChangeOwnershipOptions extends SavedObjectsBaseOptions {
  newOwnerProfileUid?: SavedObjectAccessControl['owner'];
}

export interface SavedObjectsChangeAccessModeOptions extends SavedObjectsBaseOptions {
  accessMode?: SavedObjectAccessControl['accessMode'];
}

/**
 * Options for restricting a saved object to a set of principals.
 *
 * @public
 */
export interface SavedObjectsChangeAccessControlEntriesOptions extends SavedObjectsBaseOptions {
  /** The access mode to apply. `private` restricts the object to its owner and `entries`. */
  accessMode: SavedObjectAccessControl['accessMode'];
  /** The principals to grant access to. Entries for the owner are ignored. */
  entries?: Array<Omit<SavedObjectAccessControlEntry, 'added_at'>>;
  /** The roles the saved object type supports. Entries with any other role are rejected. */
  roles: readonly [string, ...string[]];
  /**
   * The profile UID to record as the owner when the object does not have one yet. Required for
   * clients that exclude the security extension, because they cannot resolve the current user.
   */
  owner?: SavedObjectAccessControl['owner'];
}

/**
 * Options for the changing ownership of a saved object
 *
 * @public
 */
export type SavedObjectsChangeAccessControlOptions =
  | SavedObjectsChangeOwnershipOptions
  | SavedObjectsChangeAccessModeOptions
  | SavedObjectsChangeAccessControlEntriesOptions;

/**
 * Return type of the Saved Objects `changeOwnership()` method.
 *
 * @public
 */
export interface SavedObjectsChangeAccessControlResponse {
  objects: SavedObjectsChangeAccessControlResponseObject[];
}

export interface SavedObjectsChangeAccessControlResponseObject {
  id: string;
  type: string;
  error?: SavedObjectError;
}
