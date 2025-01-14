/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

/**
 * Object parameters for the check conficts operation
 *
 * @public
 */
export interface SavedObjectsCheckConflictsObject {
  /** The ID of the object to check */
  id: string;
  /** The type of the object to check */
  type: string;
}

/**
 * Return type of the Saved Objects `checkConflicts()` method.
 *
 * @public
 */
export interface SavedObjectsCheckConflictsResponse {
  /** Array of errors (contains the conflicting object ID, type, and error details) */
  errors: Array<{
    id: string;
    type: string;
    error: SavedObjectError;
  }>;
}
