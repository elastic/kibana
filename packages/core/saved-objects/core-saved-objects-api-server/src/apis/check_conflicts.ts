/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

/**
 *
 * @public
 */
export interface SavedObjectsCheckConflictsObject {
  id: string;
  type: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsCheckConflictsResponse {
  errors: Array<{
    id: string;
    type: string;
    error: SavedObjectError;
  }>;
}
