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

/** @internal */
function createEsaggs({
  getStartDependencies,
}: {
  getStartDependencies: (req: KibanaRequest) => Promise<EsaggsStartDependencies>;
}) {
  return (): EsaggsExpressionFunctionDefinition => ({
    ...getEsaggsMeta(),
    async fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, kibanaRequest }) {
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

      const aggConfigsState = JSON.parse(args.aggConfigs);
      const indexPattern = await indexPatterns.get(args.index);
      const aggConfigs = aggs.createAggConfigs(indexPattern, aggConfigsState);

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

/** @internal */
export function getEsaggs({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}) {
  return createEsaggs({
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
