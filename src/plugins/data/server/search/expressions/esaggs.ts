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
import { i18n } from '@kbn/i18n';
import { KibanaRequest, StartServicesAccessor } from 'src/core/server';
import { Adapters } from 'src/plugins/inspector/common';
import {
  EsaggsExpressionFunctionDefinition,
  EsaggsStartDependencies,
  getEsaggsMeta,
  handleEsaggsRequest,
} from '../../../common/search/expressions';
import { DataPluginStartDependencies, DataPluginStart } from '../../plugin';

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
  getStartDependencies: (req: KibanaRequest) => Promise<EsaggsStartDependencies>;
}): () => EsaggsExpressionFunctionDefinition {
  return () => ({
    ...getEsaggsMeta(),
    async fn(
      input,
      args,
      { inspectorAdapters, abortSignal, getSearchSessionId, getKibanaRequest }
    ) {
      const kibanaRequest = getKibanaRequest ? getKibanaRequest() : null;
      if (!kibanaRequest) {
        throw new Error(
          i18n.translate('data.search.esaggs.error.kibanaRequest', {
            defaultMessage:
              'A KibanaRequest is required to execute this search on the server. ' +
              'Please provide a request object to the expression execution params.',
          })
        );
      }

      const {
        aggs,
        deserializeFieldFormat,
        indexPatterns,
        searchSource,
      } = await getStartDependencies(kibanaRequest);

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
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}): () => EsaggsExpressionFunctionDefinition {
  return getFunctionDefinition({
    getStartDependencies: async (request: KibanaRequest) => {
      const [{ elasticsearch, savedObjects, uiSettings }, , self] = await getStartServices();
      const { fieldFormats, indexPatterns, search } = self;
      const esClient = elasticsearch.client.asScoped(request);
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
      const scopedFieldFormats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

      return {
        aggs: await search.aggs.asScopedToClient(savedObjectsClient, esClient.asCurrentUser),
        deserializeFieldFormat: scopedFieldFormats.deserialize.bind(scopedFieldFormats),
        indexPatterns: await indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          esClient.asCurrentUser
        ),
        searchSource: await search.searchSource.asScoped(request),
      };
    },
  });
}
