/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { Filter } from '@kbn/es-query';
import type {
  EsqlKibanaQueryContext,
  IEsqlSearchOptions,
  IEsqlSearchParams,
} from '@kbn/search-types';
import { dataService } from '../../../services/kibana_services';
import { getAnyDocumentQuery, getFieldMinMaxQuery } from './esql_source_queries';

type EsqlSourceFetchParams = Pick<IEsqlSearchParams, 'projectRouting'> &
  Pick<IEsqlSearchOptions, 'abortSignal'> & {
    dataSource: FilterableSource;
    kibanaQueryContext: Pick<EsqlKibanaQueryContext, 'timeRange' | 'kibanaFilters' | 'kqlQuery'>;
  };

const runEsqlSourceQuery = async (
  esqlQuery: string,
  { abortSignal, dataSource, kibanaQueryContext, projectRouting }: EsqlSourceFetchParams
) => {
  const { rawResponse } = await dataService.search.esql(
    {
      query: esqlQuery,
      projectRouting,
      kibanaQueryContext: { ...kibanaQueryContext, timeField: dataSource.timeFieldName },
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
    kibanaQueryContext: {
      ...params.kibanaQueryContext,
      kibanaFilters: [...(params.kibanaQueryContext.kibanaFilters ?? []), params.rangeFilter],
    },
  });
  return rows.length === 0;
};
