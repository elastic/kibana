/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DataViewBase, Filter, TimeRange, Query, ProjectRouting } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getEsQueryConfig } from '@kbn/data-plugin/public';

import { SearchAPI } from './data_model/search_api';
import { TimeCache } from './data_model/time_cache';

import type { VegaVisualizationDependencies } from './plugin';
import type { VisParams } from './vega_fn';
import { getData, getDataViews } from './services';
import type { VegaInspectorAdapters } from './vega_inspector';
import { resolveVegaEsqlSourcesOfText, type VegaEsqlSources } from './lib/vega_data_sources';

interface VegaRequestHandlerParams {
  query: Query | Query[] | undefined;
  filters: Filter[] | undefined;
  timeRange: TimeRange | undefined;
  visParams: VisParams;
  searchSessionId?: string;
  executionContext?: KibanaExecutionContext;
  projectRouting?: ProjectRouting;
  /** Only applies to ES|QL-backed vega data sources */
  isApproximate: boolean;
  esqlVariables?: ESQLControlVariable[];
  /** The resolved ES|QL sources of the spec, when the caller holds them; otherwise resolved here. */
  esqlSources?: VegaEsqlSources;
}

interface VegaRequestHandlerContext {
  abortSignal?: AbortSignal;
  inspectorAdapters?: VegaInspectorAdapters;
}

export function createVegaRequestHandler(
  {
    plugins: { data },
    core: { uiSettings, theme },
    getServiceSettings,
  }: VegaVisualizationDependencies,
  context: VegaRequestHandlerContext = {}
) {
  let searchAPI: SearchAPI;
  const { timefilter } = data.query.timefilter;
  const timeCache = new TimeCache(timefilter, 3 * 1000);

  return async function vegaRequestHandler({
    timeRange,
    filters,
    query,
    visParams,
    searchSessionId,
    executionContext,
    projectRouting,
    isApproximate,
    esqlVariables,
    esqlSources: heldEsqlSources,
  }: VegaRequestHandlerParams) {
    const { search } = getData();
    const dataViews = getDataViews();

    if (!searchAPI) {
      searchAPI = new SearchAPI(
        {
          uiSettings,
          search,
          indexPatterns: dataViews,
        },
        context.abortSignal,
        context.inspectorAdapters,
        searchSessionId,
        executionContext,
        projectRouting,
        isApproximate
      );
    }

    timeCache.setTimeRange(timeRange);

    const esqlSources = heldEsqlSources ?? (await resolveVegaEsqlSourcesOfText(visParams.spec));
    // An ES|QL filter names the dataset of a query of the spec, any other filter a data view.
    const firstFilterIndex = filters?.[0]?.meta.index;
    const filterSource: DataViewBase | undefined = firstFilterIndex
      ? esqlSources.filterableSources.find(({ id }) => id === firstFilterIndex) ??
        (await dataViews.get(firstFilterIndex).catch((): undefined => undefined))
      : undefined;

    const esQueryConfigs = getEsQueryConfig(uiSettings);
    const filtersDsl = buildEsQuery(filterSource, query ?? [], filters ?? [], esQueryConfigs);
    const { VegaParser } = await import('./async_services');

    const vp = new VegaParser(
      visParams.spec,
      searchAPI,
      timeCache,
      filtersDsl,
      getServiceSettings,
      theme.getTheme(),
      esqlVariables,
      esqlSources
    );
    return (await vp.parseAsync()).toRenderDescriptor();
  };
}
