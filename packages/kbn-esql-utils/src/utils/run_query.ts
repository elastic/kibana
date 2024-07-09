/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { ESQLColumn, ESQLSearchResponse, ESQLSearchParams } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';

export const getEarliestLatestParams = (query: string, time?: TimeRange) => {
  const earliestNamedParams = /\?earliest/i.test(query);
  const latestNamedParams = /\?latest/i.test(query);
  if (time && (earliestNamedParams || latestNamedParams)) {
    return {
      earliest: earliestNamedParams ? dateMath.parse(time.from)?.toISOString() : undefined,
      latest: latestNamedParams ? dateMath.parse(time.to)?.toISOString() : undefined,
    };
  }
  return undefined;
};

export function formatESQLColumns(columns: ESQLColumn[]): DatatableColumn[] {
  return columns.map(({ name, type }) => {
    const kibanaType = esFieldTypeToKibanaFieldType(type);
    return {
      id: name,
      name,
      meta: { type: kibanaType, esType: type },
    } as DatatableColumn;
  });
}

// Returns the columns exactly as being returned by the _query endpoint
// Based on the search api from the data plugin
export async function getESQLQueryColumnsRaw({
  esqlQuery,
  search,
  signal,
  timeRange,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  timeRange?: TimeRange;
}): Promise<ESQLColumn[]> {
  try {
    const timeParams = getEarliestLatestParams(esqlQuery, timeRange);
    const namedParams = [];
    if (timeParams?.earliest) {
      namedParams.push({ earliest: timeParams.earliest });
    }
    if (timeParams?.latest) {
      namedParams.push({ latest: timeParams.latest });
    }
    const response = await lastValueFrom(
      search(
        {
          params: {
            query: `${esqlQuery} | limit 0`,
            ...(namedParams.length ? { params: namedParams } : {}),
          },
        },
        {
          abortSignal: signal,
          strategy: 'esql_async',
        }
      )
    );

    return (response.rawResponse as unknown as ESQLSearchResponse).columns ?? [];
  } catch (error) {
    throw new Error(
      i18n.translate('esqlUtils.columnsErrorMsg', {
        defaultMessage: 'Unable to load columns. {errorMessage}',
        values: { errorMessage: error.message },
      })
    );
  }
}

// Returns the columns with the kibana format
// Based on the search api from the data plugin
export async function getESQLQueryColumns({
  esqlQuery,
  search,
  signal,
  timeRange,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  timeRange?: TimeRange;
}): Promise<DatatableColumn[]> {
  try {
    const rawColumns = await getESQLQueryColumnsRaw({ esqlQuery, search, signal, timeRange });
    const columns = formatESQLColumns(rawColumns) ?? [];
    return columns;
  } catch (error) {
    throw new Error(
      i18n.translate('esqlUtils.columnsErrorMsg', {
        defaultMessage: 'Unable to load columns. {errorMessage}',
        values: { errorMessage: error.message },
      })
    );
  }
}

// Returns the table as being returned by the _query endpoint
// Based on the search api from the data plugin
export async function getESQLResults({
  esqlQuery,
  search,
  signal,
  filter,
  dropNullColumns,
  timeRange,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
}): Promise<{
  response: ESQLSearchResponse;
  params: ESQLSearchParams;
}> {
  const timeParams = getEarliestLatestParams(esqlQuery, timeRange);
  const namedParams = [];
  if (timeParams?.earliest) {
    namedParams.push({ earliest: timeParams.earliest });
  }
  if (timeParams?.latest) {
    namedParams.push({ latest: timeParams.latest });
  }
  const result = await lastValueFrom(
    search(
      {
        params: {
          ...(filter ? { filter } : {}),
          query: esqlQuery,
          ...(dropNullColumns ? { dropNullColumns: true } : {}),
          ...(namedParams.length ? { params: namedParams } : {}),
        },
      },
      {
        abortSignal: signal,
        strategy: 'esql_async',
      }
    )
  );
  return {
    response: result.rawResponse as unknown as ESQLSearchResponse,
    params: result.requestParams as unknown as ESQLSearchParams,
  };
}
