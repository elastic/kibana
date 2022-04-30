/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { defer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StartServicesAccessor } from 'src/core/public';
import {
  EsaggsExpressionFunctionDefinition,
  EsaggsStartDependencies,
  getEsaggsMeta,
} from '../../../common/search/expressions';
import { DataPublicPluginStart, DataStartDependencies } from '../../types';

/**
 * Returns the expression function definition. Any stateful dependencies are accessed
 * at runtime via the `getStartDependencies` param, which provides the specific services
 * needed for this function to run.
 *
 * This function is an implementation detail of this module, and is exported separately
 * only for testing purposes.
 *
 * @param getStartDependencies - async function that resolves with EsaggsStartDependencies
 *
 * @internal
 */
export function getFunctionDefinition({
  getStartDependencies,
}: {
  getStartDependencies: () => Promise<EsaggsStartDependencies>;
}) {
  return (): EsaggsExpressionFunctionDefinition => ({
    ...getEsaggsMeta(),
    fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext }) {
      return defer(async () => {
        const { aggs, indexPatterns, searchSource, getNow } = await getStartDependencies();

        const indexPattern = await indexPatterns.create(args.index.value, true);
        const aggConfigs = aggs.createAggConfigs(
          indexPattern,
          args.aggs?.map((agg) => agg.value) ?? []
        );
        aggConfigs.hierarchical = args.metricsAtAllLevels;

        const { handleEsaggsRequest } = await import('../../../common/search/expressions');

        return { aggConfigs, indexPattern, searchSource, getNow, handleEsaggsRequest };
      }).pipe(
        switchMap(({ aggConfigs, indexPattern, searchSource, getNow, handleEsaggsRequest }) => {
          return handleEsaggsRequest({
            abortSignal,
            aggs: aggConfigs,
            filters: get(input, 'filters', undefined),
            indexPattern,
            inspectorAdapters,
            partialRows: args.partialRows,
            query: get(input, 'query', undefined) as any,
            searchSessionId: getSearchSessionId(),
            searchSourceService: searchSource,
            timeFields: args.timeFields,
            timeRange: get(input, 'timeRange', undefined),
            getNow,
            executionContext: getExecutionContext(),
          });
        })
      );
    },
  });
}

/**
 * This is some glue code that takes in `core.getStartServices`, extracts the dependencies
 * needed for this function, and wraps them behind a `getStartDependencies` function that
 * is then called at runtime.
 *
 * We do this so that we can be explicit about exactly which dependencies the function
 * requires, without cluttering up the top-level `plugin.ts` with this logic. It also
 * makes testing the expression function a bit easier since `getStartDependencies` is
 * the only thing you should need to mock.
 *
 * @param getStartServices - core's StartServicesAccessor for this plugin
 *
 * @internal
 */
export function getEsaggs({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
}) {
  return getFunctionDefinition({
    getStartDependencies: async () => {
      const [, , self] = await getStartServices();
      const { indexPatterns, search, nowProvider } = self;
      return {
        aggs: search.aggs,
        indexPatterns,
        searchSource: search.searchSource,
        getNow: () => nowProvider.get(),
      };
    },
  });
}
