/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { SavedObjectAccessControl } from '../..';
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
 * Options for the changing ownership of a saved object
 *
 * @public
 */
export type SavedObjectsChangeAccessControlOptions =
  | SavedObjectsChangeOwnershipOptions
  | SavedObjectsChangeAccessModeOptions;

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
