/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpStart, SavedObjectsFindOptionsReference } from 'src/core/public';

export async function getSavedObjectCounts({
  http,
  searchString,
  typesToInclude,
  references,
}: {
  http: HttpStart;
  typesToInclude: string[];
  searchString?: string;
  references?: SavedObjectsFindOptionsReference[];
}): Promise<Record<string, number>> {
  return await http.post<Record<string, number>>(
    `/api/kibana/management/saved_objects/scroll/counts`,
    { body: JSON.stringify({ typesToInclude, searchString, references }) }
  );
}
