/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { keysToCamelCaseShallow } from './case_conversion';
import { FindQueryHTTPV1, FindResponseHTTPV1 } from '../../common/types';

export async function findObjects(
  http: HttpStart,
  findOptions: FindQueryHTTPV1
): Promise<FindResponseHTTPV1> {
  const response = await http.get<Record<string, any>>(
    '/api/kibana/management/saved_objects/_find',
    {
      query: {
        ...findOptions,
        hasReference: findOptions.hasReference
          ? JSON.stringify(findOptions.hasReference)
          : undefined,
      } as Record<string, any>,
    }
  );

  return keysToCamelCaseShallow(response) as FindResponseHTTPV1;
}
