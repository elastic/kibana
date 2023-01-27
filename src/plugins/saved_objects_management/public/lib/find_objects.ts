/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { FindQueryHTTPV1, FindResponseHTTPV1 } from '../../common/types';

export async function findObjects(
  http: HttpStart,
  findOptions: FindQueryHTTPV1
): Promise<FindResponseHTTPV1> {
  return http.get<FindResponseHTTPV1>('/api/kibana/management/saved_objects/_find', {
    query: {
      ...findOptions,
      hasReference: findOptions.hasReference ? JSON.stringify(findOptions.hasReference) : undefined,
    } as Record<string, any>,
  });
}
