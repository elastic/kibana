/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from 'kibana/server';
import { from } from 'rxjs';
import { KibanaRequest } from 'kibana/server';
import { mergeMap } from 'rxjs/operators';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import { DataPluginStart } from '../../../plugin';
import {
  CreateAggConfigParams,
  IKibanaSearchRequest,
  SearchSourceFields,
} from '../../../../common';

export const searchSourceStrategyProvider = (
  logger: Logger,
  data: DataPluginStart
): ISearchStrategy<IKibanaSearchRequest<SearchSourceFields>> => {
  const getSearchSource = async (request: KibanaRequest, fields?: SearchSourceFields) => {
    const { create } = await data.search.searchSource.asScoped(request);
    return create(fields);
  };

  const getAggConfigs = (deps: SearchStrategyDependencies) => {
    return data.search.aggs.asScopedToClient(deps.savedObjectsClient, deps.esClient.asCurrentUser);
  };

  return {
    search: (request, { strategy, ...options }, deps) => {
      return from(
        Promise.all([getSearchSource(deps.request, request.params), getAggConfigs(deps)])
      ).pipe(
        mergeMap(([searchSource, AggConfigs]) => {
          const { aggs } = request.params ?? {};
          searchSource.setField(
            'aggs',
            AggConfigs.createAggConfigs(
              searchSource.getField('index')!,
              aggs as CreateAggConfigParams[]
            )
          );
          return searchSource.fetch$(options);
        })
      );
    },
    cancel: async (id, options) => {},
    extend: async (id, keepAlive, options, { esClient }) => {},
  };
};
