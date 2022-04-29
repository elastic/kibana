/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AllowedPluginSource } from '../../common/types';

interface GetAllowedTypesResponse {
  sources: AllowedPluginSource[];
}

export async function getAllowedPluginSources(http: HttpStart): Promise<AllowedPluginSource[]> {
  const response = await http.get<GetAllowedTypesResponse>('/api/plugins/_allowed_sources');
  return response.sources;
}
