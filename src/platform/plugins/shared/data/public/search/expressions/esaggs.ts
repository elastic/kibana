/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { defer } from 'rxjs';
import { switchMap } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core/public';
import type {
  EsaggsExpressionFunctionDefinition,
  EsaggsStartDependencies,
} from '../../../common/search/expressions';
import { getEsaggsMeta, getSideEffectFunction } from '../../../common/search/expressions';
import type { DataPublicPluginStart, DataStartDependencies } from '../../types';

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
    allowCache: {
      withSideEffects: (_, { inspectorAdapters }) => {
        return getSideEffectFunction(inspectorAdapters);
      },
    },
    fn(
      input,
      args,
      { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext, getSearchContext }
    ) {
      return defer(async () => {
        const [{ aggs, dataViews, searchSource, getNow }, { handleEsaggsRequest }] =
          await Promise.all([getStartDependencies(), import('../../../common/search/expressions')]);

        const indexPattern = await dataViews.create(args.index.value, true);
        const aggConfigs = aggs.createAggConfigs(
          indexPattern,
          args.aggs?.map((agg) => agg.value) ?? [],
          {
            hierarchical: args.metricsAtAllLevels,
            partialRows: args.partialRows,
            probability: args.probability,
            samplerSeed: args.samplerSeed,
          }
        );

        return { aggConfigs, indexPattern, searchSource, getNow, handleEsaggsRequest };
      }).pipe(
        switchMap(({ aggConfigs, indexPattern, searchSource, getNow, handleEsaggsRequest }) => {
          const { disableWarningToasts } = getSearchContext();

          return handleEsaggsRequest({
            abortSignal,
            aggs: aggConfigs,
            filters: args.ignoreGlobalFilters ? undefined : get(input, 'filters', undefined),
            indexPattern,
            inspectorAdapters,
            query: args.ignoreGlobalFilters ? undefined : (get(input, 'query', undefined) as any),
            searchSessionId: getSearchSessionId(),
            searchSourceService: searchSource,
            timeFields: args.timeFields,
            timeRange: get(input, 'timeRange', undefined),
            disableWarningToasts: (disableWarningToasts || false) as boolean,
            getNow,
            executionContext: getExecutionContext(),
            projectRouting: get(input, 'projectRouting', undefined),
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
      const [, { dataViews }, self] = await getStartServices();
      const { search, nowProvider } = self;
      return {
        aggs: search.aggs,
        dataViews,
        searchSource: search.searchSource,
        getNow: () => nowProvider.get(),
      };
    },
  });
}
