/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { SavedObjectWithMetadata } from '../types';

export async function bulkGetObjects(
  http: HttpStart,
  objects: Array<{ type: string; id: string }>
): Promise<SavedObjectWithMetadata[]> {
  return await http.post<SavedObjectWithMetadata[]>(
    `/api/kibana/management/saved_objects/_bulk_get`,
    { body: JSON.stringify(objects) }
  );
}
