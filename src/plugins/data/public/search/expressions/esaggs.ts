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
import { Adapters } from 'src/plugins/inspector/common';
import {
  EsaggsExpressionFunctionDefinition,
  EsaggsStartDependencies,
  getEsaggsMeta,
  handleEsaggsRequest,
} from '../../../common/search/expressions';

/** @internal */
export function getEsaggs({
  getStartDependencies,
}: {
  getStartDependencies: () => Promise<EsaggsStartDependencies>;
}) {
  return (): EsaggsExpressionFunctionDefinition => ({
    ...getEsaggsMeta(),
    async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId }) {
      const {
        addFilters,
        aggs,
        deserializeFieldFormat,
        indexPatterns,
        searchSource,
      } = await getStartDependencies();

      const aggConfigsState = JSON.parse(args.aggConfigs);
      const indexPattern = await indexPatterns.get(args.index);
      const aggConfigs = aggs.createAggConfigs(indexPattern, aggConfigsState);

      return await handleEsaggsRequest(input, args, {
        abortSignal: (abortSignal as unknown) as AbortSignal,
        addFilters,
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
      });
    },
  });
}
