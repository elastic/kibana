/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import { StartServicesAccessor } from 'src/core/public';
import { Adapters } from 'src/plugins/inspector/common';
import {
  EsaggsExpressionFunctionDefinition,
  EsaggsStartDependencies,
  getEsaggsMeta,
  handleEsaggsRequest,
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
    async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId }) {
      const {
        aggs,
        deserializeFieldFormat,
        indexPatterns,
        searchSource,
        getNow,
      } = await getStartDependencies();

      const indexPattern = await indexPatterns.create(args.index.value, true);
      const aggConfigs = aggs.createAggConfigs(
        indexPattern,
        args.aggs!.map((agg) => agg.value)
      );

      return await handleEsaggsRequest(input, args, {
        abortSignal: (abortSignal as unknown) as AbortSignal,
        aggs: aggConfigs,
        deserializeFieldFormat,
        filters: get(input, 'filters', undefined),
        indexPattern,
        inspectorAdapters: inspectorAdapters as Adapters,
        metricsAtAllLevels: args.metricsAtAllLevels,
        partialRows: args.partialRows,
        query: get(input, 'query', undefined) as any,
        searchSessionId: getSearchSessionId(),
        searchSourceService: searchSource,
        timeFields: args.timeFields,
        timeRange: get(input, 'timeRange', undefined),
        getNow,
      });
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
      const { fieldFormats, indexPatterns, search, nowProvider } = self;
      return {
        aggs: search.aggs,
        deserializeFieldFormat: fieldFormats.deserialize.bind(fieldFormats),
        indexPatterns,
        searchSource: search.searchSource,
        getNow: () => nowProvider.get(),
      };
    },
  });
}
