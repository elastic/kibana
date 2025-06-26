/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectAccessControl } from '../..';
import type { SavedObjectsBaseOptions } from './base';
/**
 * Options for the changing ownership of a saved object
 *
 * @public
 */

export interface SavedObjectsChangeOwnershipOptions<Attributes = unknown>
  extends SavedObjectsBaseOptions {
  owner?: SavedObjectAccessControl['owner'];
}

/**
 * Return type of the Saved Objects `changeOwnership()` method.
 *
 * @public
 */
export interface SavedObjectsChangeOwnershipResponse<T = unknown>
  extends Omit<SavedObject<T>, 'accessControl'> {
  accessControl: SavedObjectAccessControl;
}

export interface SavedObjectsChangeOwnershipObject {
  id: string;
  type: string;
}
