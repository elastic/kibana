/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ProjectRouting, TimeRange } from '@kbn/es-query';
import { getTimeZoneFromSettings } from '@kbn/es-query';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { ESQLColumn, ESQLSearchResponse, ESQLSearchParams } from '@kbn/es-types';
import { lastValueFrom } from 'rxjs';
import {
  getGeohashPrecision,
  getGeohexPrecision,
  getGeotilePrecision,
  type GRID_RESOLUTION,
} from '@kbn/geo-precision';
import {
  type ESQLControlVariable,
  GEOHASH_PRECISION_PARAM,
  GEOHEX_PRECISION_PARAM,
  GEOTILE_PRECISION_PARAM,
} from '@kbn/esql-types';
import { getESQLQueryVariables } from './query_parsing_helpers';

const hasNamedParam = (query: string, name: string) => new RegExp(`\\?${name}\\b`, 'i').test(query);

export const hasStartEndParams = (query: string) =>
  hasNamedParam(query, '_tstart') || hasNamedParam(query, '_tend');

export const getStartEndParams = (query: string, time?: TimeRange) => {
  const startNamedParams = hasNamedParam(query, '_tstart');
  const endNamedParams = hasNamedParam(query, '_tend');
  if (time && (startNamedParams || endNamedParams)) {
    const timeParams = {
      start: startNamedParams ? dateMath.parse(time.from)?.toISOString() : undefined,
      end: endNamedParams ? dateMath.parse(time.to, { roundUp: true })?.toISOString() : undefined,
    };
    const namedParams = [];
    if (timeParams?.start) {
      namedParams.push({ _tstart: timeParams.start });
    }
    if (timeParams?.end) {
      namedParams.push({ _tend: timeParams.end });
    }
    return namedParams;
  }
  return [];
};

/** Map zoom and grid resolution used to derive the values of the geo precision params. */
export interface GeoPrecisionParams {
  zoom: number;
  resolution?: GRID_RESOLUTION;
}

export const hasGeotilePrecisionParam = (query: string) =>
  hasNamedParam(query, GEOTILE_PRECISION_PARAM);

export const hasGeohashPrecisionParam = (query: string) =>
  hasNamedParam(query, GEOHASH_PRECISION_PARAM);

export const hasGeohexPrecisionParam = (query: string) =>
  hasNamedParam(query, GEOHEX_PRECISION_PARAM);

/**
 * Returns the `?_geotile_precision`, `?_geohex_precision` and `?_geohash_precision` named params
 * the query uses.
 * Values are derived from the map zoom and grid resolution.
 */
const getGeoPrecisionParams = (query: string, zoom: number, resolution?: GRID_RESOLUTION) => {
  const namedParams: Array<Record<string, number>> = [];
  if (hasGeotilePrecisionParam(query)) {
    namedParams.push({ [GEOTILE_PRECISION_PARAM]: getGeotilePrecision(zoom, resolution) });
  }
  if (hasGeohexPrecisionParam(query)) {
    namedParams.push({ [GEOHEX_PRECISION_PARAM]: getGeohexPrecision(zoom, resolution) });
  }
  if (hasGeohashPrecisionParam(query)) {
    namedParams.push({ [GEOHASH_PRECISION_PARAM]: getGeohashPrecision(zoom, resolution) });
  }
  return namedParams;
};

export const getNamedParams = (
  query: string,
  timeRange?: TimeRange,
  variables?: ESQLControlVariable[],
  geoPrecision?: GeoPrecisionParams
) => {
  const namedParams: ESQLSearchParams['params'] = [
    ...getStartEndParams(query, timeRange),
    ...(geoPrecision
      ? getGeoPrecisionParams(query, geoPrecision.zoom, geoPrecision.resolution)
      : []),
  ];
  if (variables?.length) {
    const usedVariables = new Set(getESQLQueryVariables(query));
    variables
      .filter(({ key }) => usedVariables.has(key))
      .forEach(({ key, value }) => {
        namedParams.push({ [key]: value });
      });
  }
  return namedParams;
};

export function formatESQLColumns(columns: ESQLColumn[]): DatatableColumn[] {
  return columns.map(({ name, type, _meta }) => {
    const kibanaType = esFieldTypeToKibanaFieldType(type);
    return {
      id: name,
      name,
      meta: {
        type: kibanaType,
        esType: type,
        ...(_meta !== undefined && { esMeta: _meta }),
      },
    } as DatatableColumn;
  });
}

// Returns the columns exactly as being returned by the _query endpoint
// Based on the search api from the data plugin
export async function getESQLQueryColumnsRaw({
  esqlQuery,
  search,
  signal,
  filter,
  dropNullColumns,
  timeRange,
  variables,
  includeColumnMetadata,
  projectRouting,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  dropNullColumns?: boolean;
  filter?: unknown;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  includeColumnMetadata?: boolean;
  projectRouting?: ProjectRouting;
}): Promise<ESQLColumn[]> {
  try {
    // Columns are resolved with `LIMIT 0`, so any valid precision works.
    const namedParams = getNamedParams(esqlQuery, timeRange, variables, { zoom: 0 });
    const response = await lastValueFrom(
      search(
        {
          params: {
            ...(filter ? { filter } : {}),
            query: `${esqlQuery} | limit 0`,
            ...(dropNullColumns ? { dropNullColumns: true } : {}),
            ...(namedParams.length ? { params: namedParams } : {}),
            ...(includeColumnMetadata ? { settings: { column_metadata: true } } : {}),
          },
        },
        {
          abortSignal: signal,
          strategy: 'esql_async',
          ...(projectRouting !== undefined ? { projectRouting } : {}),
        }
      )
    );

    const table = response.rawResponse as unknown as ESQLSearchResponse;
    const hasEmptyColumns = table.all_columns && table.all_columns?.length > table.columns.length;
    const lookup = new Set(hasEmptyColumns ? table.columns?.map(({ name }) => name) || [] : []);

    const allColumns =
      (table.all_columns ?? table.columns)?.map(({ name, type, original_types, _meta }) => {
        return {
          name,
          type,
          original_types,
          isNull: hasEmptyColumns ? !lookup.has(name) : false,
          ...(_meta !== undefined && { _meta }),
        };
      }) ?? [];

    return allColumns ?? [];
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
  filter,
  dropNullColumns,
  timeRange,
  variables,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  includeColumnMetadata?: boolean;
}): Promise<DatatableColumn[]> {
  try {
    const rawColumns = await getESQLQueryColumnsRaw({
      esqlQuery,
      search,
      filter,
      dropNullColumns,
      signal,
      timeRange,
      variables,
      includeColumnMetadata,
    });
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

// The parameters getESQLResults sends to the ES|QL search. Exported so callers that display the
// request (for example in Inspector) show exactly what is sent.
export function getEsqlSearchParams({
  esqlQuery,
  filter,
  dropNullColumns,
  timeRange,
  variables,
  timezone,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  timezone?: string;
  includeColumnMetadata?: boolean;
}) {
  const namedParams = getNamedParams(esqlQuery, timeRange, variables);
  return {
    ...(filter ? { filter } : {}),
    query: esqlQuery,
    ...(dropNullColumns ? { dropNullColumns: true } : {}),
    ...(namedParams.length ? { params: namedParams } : {}),
    ...(timezone ? { time_zone: getTimeZoneFromSettings(timezone) } : {}),
    ...(includeColumnMetadata ? { settings: { column_metadata: true } } : {}),
  };
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
  variables,
  timezone,
  executionContext,
  approximation,
  projectRouting,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  timezone?: string;
  executionContext?: KibanaExecutionContext;
  approximation?: boolean;
  projectRouting?: ProjectRouting;
  includeColumnMetadata?: boolean;
}): Promise<{
  response: ESQLSearchResponse;
  params: ESQLSearchParams;
}> {
  const result = await lastValueFrom(
    search(
      {
        params: getEsqlSearchParams({
          esqlQuery,
          filter,
          dropNullColumns,
          timeRange,
          variables,
          timezone,
          includeColumnMetadata,
        }),
      },
      {
        abortSignal: signal,
        strategy: 'esql_async',
        ...(executionContext ? { executionContext } : {}),
        ...(approximation !== undefined ? { approximation } : {}),
        ...(projectRouting !== undefined ? { projectRouting } : {}),
      }
    )
  );

  const rawResponse = result.rawResponse as unknown as ESQLSearchResponse;

  // Normalize response.values: if all arrays are empty, convert to single empty array
  const normalizedValues =
    rawResponse.values && rawResponse.values.every((row) => Array.isArray(row) && row.length === 0)
      ? []
      : rawResponse.values;

  const response = {
    ...rawResponse,
    values: normalizedValues,
  };

  return {
    response,
    params: result.requestParams as unknown as ESQLSearchParams,
  };
}
