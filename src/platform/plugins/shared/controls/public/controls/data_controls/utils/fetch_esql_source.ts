/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { dataService } from '../../../services/kibana_services';
import { getAnyDocumentQuery, getFieldMinMaxQuery } from './esql_source_queries';

interface EsqlSourceFetchParams {
  abortSignal: AbortSignal;
  dataSource: FilterableSource;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  projectRouting?: string;
}

const runEsqlSourceQuery = async (
  esqlQuery: string,
  { abortSignal, dataSource, filters, query, timeRange, projectRouting }: EsqlSourceFetchParams
) => {
  const { rawResponse } = await dataService.search.esql(
    {
      query: esqlQuery,
      projectRouting,
      kibanaQueryContext: {
        timeRange,
        timeField: dataSource.timeFieldName,
        kibanaFilters: filters,
        kqlQuery: query,
      },
    },
    { abortSignal }
  );
  return rawResponse.values;
};

export const fetchEsqlSourceMinMax = async (
  params: EsqlSourceFetchParams & { field: FilterableField }
): Promise<{ min: number | undefined; max: number | undefined }> => {
  const [[min, max] = []] = await runEsqlSourceQuery(
    getFieldMinMaxQuery(params.dataSource, params.field.name),
    params
  );
  return {
    min: typeof min === 'number' ? min : undefined,
    max: typeof max === 'number' ? max : undefined,
  };
};

export const fetchEsqlSourceHasNoResults = async (
  params: EsqlSourceFetchParams & { rangeFilter: Filter }
): Promise<boolean> => {
  const rows = await runEsqlSourceQuery(getAnyDocumentQuery(params.dataSource), {
    ...params,
    filters: [...(params.filters ?? []), params.rangeFilter],
  });
  return rows.length === 0;
};
