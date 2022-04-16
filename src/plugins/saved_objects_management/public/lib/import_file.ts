/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, SavedObjectsImportResponse } from '@kbn/core/public';
import { ImportMode } from '../management_section/objects_table/components/import_mode_control';

export async function importFile(
  http: HttpStart,
  file: File,
  { createNewCopies, overwrite }: ImportMode
) {
  const formData = new FormData();
  formData.append('file', file);
  const query = createNewCopies ? { createNewCopies } : { overwrite };
  return await http.post<SavedObjectsImportResponse>('/api/saved_objects/_import', {
    body: formData,
    headers: {
      // Important to be undefined, it forces proper headers to be set for FormData
      'Content-Type': undefined,
    },
    query,
  });
}
