/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';
import type { FetchEsqlQueryParams } from './types';

export const fetchEsqlQuery = async ({
  data,
  query,
  filter,
}: FetchEsqlQueryParams): Promise<ESQLSearchResponse> => {
  const response = await lastValueFrom(
    data.search.search<{ params: ESQLSearchParams }, { rawResponse: ESQLSearchResponse }>(
      {
        params: {
          query,
          filter,
        },
      },
      {
        strategy: 'esql_async',
        retrieveResults: true,
      }
    )
  );

  return response.rawResponse;
};
