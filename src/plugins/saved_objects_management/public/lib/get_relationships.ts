/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { get } from 'lodash';
import { SavedObjectGetRelationshipsResponse } from '../types';

export async function getRelationships(
  http: HttpStart,
  type: string,
  id: string,
  savedObjectTypes: string[]
): Promise<SavedObjectGetRelationshipsResponse> {
  const url = `/api/kibana/management/saved_objects/relationships/${encodeURIComponent(
    type
  )}/${encodeURIComponent(id)}`;
  try {
    return await http.get<SavedObjectGetRelationshipsResponse>(url, {
      query: {
        savedObjectTypes,
      },
    });
  } catch (respError) {
    const respBody = get(respError, 'data', {}) as any;
    const err = new Error(respBody.message || respBody.error || `${respError.status} Response`);

    (err as any).statusCode = respBody.statusCode || respError.status;
    (err as any).body = respBody;

    throw err;
  }
}
