/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, SavedObjectsFindOptionsReference } from '@kbn/core/public';
import type { ScrollCountResponseHTTPV1 } from '../../common/types';

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
}): Promise<ScrollCountResponseHTTPV1> {
  return await http.post(`/api/kibana/management/saved_objects/scroll/counts`, {
    body: JSON.stringify({ typesToInclude, searchString, references }),
  });
}
