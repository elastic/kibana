/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpStart, SavedObjectsFindOptionsReference } from 'src/core/public';

export async function fetchExportByTypeAndSearch({
  http,
  search,
  types,
  references,
  includeReferencesDeep = false,
}: {
  http: HttpStart;
  types: string[];
  search?: string;
  references?: SavedObjectsFindOptionsReference[];
  includeReferencesDeep?: boolean;
}): Promise<Blob> {
  return http.post('/api/saved_objects/_export', {
    body: JSON.stringify({
      type: types,
      search,
      hasReference: references,
      includeReferencesDeep,
    }),
  });
}
