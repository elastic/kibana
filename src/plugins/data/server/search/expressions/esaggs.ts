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
import { i18n } from '@kbn/i18n';
import { KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
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
    fn(input, args, { inspectorAdapters, abortSignal, getSearchSessionId, getKibanaRequest }) {
      return defer(async () => {
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

        const { aggs, indexPatterns, searchSource } = await getStartDependencies(kibanaRequest);

        const indexPattern = await indexPatterns.create(args.index.value, true);
        const aggConfigs = aggs.createAggConfigs(
          indexPattern,
          args.aggs?.map((agg) => agg.value) ?? []
        );

        aggConfigs.hierarchical = args.metricsAtAllLevels;

        return { aggConfigs, indexPattern, searchSource };
      }).pipe(
        switchMap(({ aggConfigs, indexPattern, searchSource }) =>
          handleEsaggsRequest({
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
          })
        )
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
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}): () => EsaggsExpressionFunctionDefinition {
  return getFunctionDefinition({
    getStartDependencies: async (request: KibanaRequest) => {
      const [{ elasticsearch, savedObjects }, , self] = await getStartServices();
      const { indexPatterns, search } = self;
      const esClient = elasticsearch.client.asScoped(request);
      const savedObjectsClient = savedObjects.getScopedClient(request);

      return {
        aggs: await search.aggs.asScopedToClient(savedObjectsClient, esClient.asCurrentUser),
        indexPatterns: await indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          esClient.asCurrentUser
        ),
        searchSource: await search.searchSource.asScoped(request),
      };
    },
  });
}
