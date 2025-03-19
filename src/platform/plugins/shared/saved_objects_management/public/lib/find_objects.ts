/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';

export async function findObjects(
  http: HttpStart,
  findOptions: v1.FindQueryHTTP
): Promise<v1.FindResponseHTTP> {
  return http.get('/api/kibana/management/saved_objects/_find', {
    query: {
      ...findOptions,
      hasReference: findOptions.hasReference ? JSON.stringify(findOptions.hasReference) : undefined,
    } as Record<string, any>,
  });
}
