/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, SavedObjectsFindOptions } from '@kbn/core/public';
import { keysToCamelCaseShallow } from './case_conversion';
import { SavedObjectWithMetadata } from '../types';

interface SavedObjectsFindResponse {
  total: number;
  page: number;
  perPage: number;
  savedObjects: SavedObjectWithMetadata[];
}

export async function findObjects(
  http: HttpStart,
  findOptions: SavedObjectsFindOptions
): Promise<SavedObjectsFindResponse> {
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

  return keysToCamelCaseShallow(response) as SavedObjectsFindResponse;
}
