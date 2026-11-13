/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OptionsListSearchTechnique,
  OptionsListSelection,
  OptionsListSortingType,
} from '@kbn/controls-schemas';
import { ControlValuesSource } from '@kbn/controls-constants';
import { getFilterableFieldSpec, isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { FetchContext } from '@kbn/presentation-publishing';

import { isValidSearch } from '../../../../common/options_list/is_valid_search';
import type {
  OptionsListESQLFetchBody,
  OptionsListSuccessResponse,
  OptionsListUnifiedFetchBody,
} from '../../../../common/options_list/types';
import {
  buildESQLPreFilter,
  buildOptionsListDashboardFilters,
  getFetchContextTimeRange,
  getFieldValuesQuery,
} from '../utils';

export type BuildOptionsListFetchBodyResult =
  | {
      outcome: 'fetch';
      body: OptionsListUnifiedFetchBody;
      showLoadingSuggestions: boolean;
    }
  | {
      outcome: 'empty';
      response: OptionsListSuccessResponse | Pick<OptionsListSuccessResponse, 'suggestions'>;
    };

type EsqlBodyParams = Pick<
  Parameters<typeof buildOptionsListFetchBody>[0],
  | 'fetchContext'
  | 'useGlobalFilters'
  | 'sort'
  | 'searchString'
  | 'searchTechnique'
  | 'selectedOptions'
  | 'ignoreValidations'
> & { esql: string; dataSource?: FilterableSource };

const buildEsqlFetchBody = ({
  esql,
  dataSource,
  fetchContext,
  useGlobalFilters,
  sort,
  searchString,
  searchTechnique,
  selectedOptions,
  ignoreValidations,
}: EsqlBodyParams): OptionsListESQLFetchBody => {
  const timeRange = getFetchContextTimeRange(fetchContext, useGlobalFilters);
  return {
    kind: 'esql',
    esql,
    timeRange,
    filter: buildESQLPreFilter({
      fetchContext,
      useGlobalFilters,
      dataSource,
      timeRange,
      esqlQuery: esql,
    }),
    sort,
    searchString,
    searchTechnique,
    selectedOptions,
    esqlVariables: fetchContext.esqlVariables,
    ignoreValidations,
    isReload: fetchContext.isReload,
    projectRouting: fetchContext.projectRouting,
  };
};

export function buildOptionsListFetchBody({
  valuesSource,
  esqlQuery,
  dataSources,
  field,
  fetchContext,
  useGlobalFilters,
  searchString,
  sort,
  searchTechnique,
  requestSize,
  runPastTimeout,
  selectedOptions,
  ignoreValidations,
}: {
  valuesSource: ControlValuesSource;
  esqlQuery?: string;
  dataSources?: FilterableSource[];
  field?: FilterableField;
  fetchContext: FetchContext;
  useGlobalFilters: boolean | undefined;
  searchString: string;
  sort: OptionsListSortingType;
  searchTechnique: OptionsListSearchTechnique;
  requestSize: number;
  runPastTimeout: boolean;
  selectedOptions: OptionsListSelection[];
  ignoreValidations: boolean | undefined;
}): BuildOptionsListFetchBodyResult {
  const dataSource = dataSources?.[0];
  if (
    valuesSource === ControlValuesSource.ESQL ||
    (dataSource && isEsqlFilterableSource(dataSource))
  ) {
    const esql =
      valuesSource === ControlValuesSource.ESQL
        ? esqlQuery
        : dataSource && field && getFieldValuesQuery(dataSource, field.name);
    if (!esql) {
      return { outcome: 'empty', response: { suggestions: [] } };
    }

    const body = buildEsqlFetchBody({
      esql,
      dataSource,
      fetchContext,
      useGlobalFilters,
      sort,
      searchString,
      searchTechnique,
      selectedOptions,
      ignoreValidations,
    });

    return { outcome: 'fetch', body, showLoadingSuggestions: false };
  }

  if (
    !dataSource ||
    !field ||
    !isValidSearch({ searchString, fieldType: field.type, searchTechnique })
  ) {
    return { outcome: 'empty', response: { suggestions: [], totalCardinality: 0 } };
  }

  const filters = buildOptionsListDashboardFilters(dataSource, fetchContext, useGlobalFilters);

  return {
    outcome: 'fetch',
    showLoadingSuggestions: true,
    body: {
      kind: 'dsl',
      index: dataSource.title,
      sort,
      searchString,
      runPastTimeout,
      searchTechnique,
      selectedOptions,
      fieldName: field.name,
      fieldSpec: getFilterableFieldSpec(field),
      size: requestSize,
      ignoreValidations,
      filters,
      runtimeFieldMap: dataSource.toSpec?.(false).runtimeFieldMap,
      isReload: fetchContext.isReload,
      projectRouting: fetchContext.projectRouting,
    },
  };
}
