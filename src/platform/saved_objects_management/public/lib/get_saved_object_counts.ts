/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';

export async function getSavedObjectCounts({
  http,
  searchString,
  typesToInclude,
  references,
}: {
  http: HttpStart;
} & v1.ScrollCountBodyHTTP): Promise<v1.ScrollCountResponseHTTP> {
  return await http.post(`/api/kibana/management/saved_objects/scroll/counts`, {
    body: JSON.stringify({ typesToInclude, searchString, references }),
  });
}
