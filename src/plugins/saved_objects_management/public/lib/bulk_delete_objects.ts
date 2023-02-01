/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { SavedObjectError, SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';

interface SavedObjectDeleteStatus {
  id: string;
  success: boolean;
  type: string;
  error?: SavedObjectError;
}

export function bulkDeleteObjects(
  http: HttpStart,
  objects: SavedObjectTypeIdTuple[]
): Promise<SavedObjectDeleteStatus[]> {
  return http.post<SavedObjectDeleteStatus[]>(
    '/internal/kibana/management/saved_objects/_bulk_delete',
    {
      body: JSON.stringify(objects),
    }
  );
}
