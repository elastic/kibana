/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from 'src/core/public';

interface GetAllowedTypesResponse {
  types: string[];
}

export async function getAllowedTypes(http: HttpStart) {
  const response = await http.get<GetAllowedTypesResponse>(
    '/api/kibana/management/saved_objects/_allowed_types'
  );
  return response.types;
}
