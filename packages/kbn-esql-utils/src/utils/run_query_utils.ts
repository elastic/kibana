/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { ESQLSearchReponse } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';
import { ESQL_LATEST_VERSION } from '../../constants';

export async function getESQLQueryColumns({
  esqlQuery,
  search,
  signal,
}: {
  esqlQuery: string;
  search: ISearchStart;
  signal?: AbortSignal;
}): Promise<DatatableColumn[]> {
  const response = await lastValueFrom(
    search.search(
      {
        params: {
          query: `${esqlQuery}`,
          version: ESQL_LATEST_VERSION,
        },
      },
      {
        abortSignal: signal,
        strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      }
    )
  );

  const columns =
    (response.rawResponse as unknown as ESQLSearchReponse).columns?.map(({ name, type }) => {
      const kibanaType = esFieldTypeToKibanaFieldType(type);
      const column = {
        id: name,
        name,
        meta: { type: kibanaType, esType: type },
      } as DatatableColumn;

      return column;
    }) ?? [];

  return columns;
}
