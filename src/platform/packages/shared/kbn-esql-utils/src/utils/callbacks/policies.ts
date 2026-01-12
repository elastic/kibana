/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';

type EsqlPolicy = Omit<SerializedEnrichPolicy, 'type' | 'query'>;

/**
 * Fetches the list of enrich policies from the server, formatted as EsqlPolicy objects.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to an array of EsqlPolicy objects.
 */
export const getEsqlPolicies = async (http: HttpStart): Promise<EsqlPolicy[]> => {
  try {
    const policies = (await http.get(
      `/internal/index_management/enrich_policies`
    )) as SerializedEnrichPolicy[];

    return policies.map(({ type, query: policyQuery, ...rest }) => rest);
  } catch (error) {
    return [];
  }
};
