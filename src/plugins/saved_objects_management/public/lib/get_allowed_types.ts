/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core/public';
import type { SavedObjectManagementTypeInfo } from '../../common/types';

interface GetAllowedTypesResponse {
  types: SavedObjectManagementTypeInfo[];
}

export async function getAllowedTypes(http: HttpStart): Promise<SavedObjectManagementTypeInfo[]> {
  const response = await http.get<GetAllowedTypesResponse>(
    '/api/kibana/management/saved_objects/_allowed_types'
  );
  return response.types;
}
