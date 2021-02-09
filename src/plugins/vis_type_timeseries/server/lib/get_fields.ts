/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import { first, map } from 'rxjs/operators';
import { KibanaRequest } from 'kibana/server';

import { Framework } from '../plugin';
import { IndexPatternsFetcher } from '../../../data/server';
import { ReqFacade } from './search_strategies/strategies/abstract_search_strategy';
import { VisTypeTimeseriesRequestHandlerContext } from '../types';

export async function getFields(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: KibanaRequest,
  framework: Framework,
  indexPatternString: string
) {
  const getIndexPatternsService = async () => {
    const [, { data }] = await framework.core.getStartServices();

    return await data.indexPatterns.indexPatternsServiceFactory(
      requestContext.core.savedObjects.client,
      requestContext.core.elasticsearch.client.asCurrentUser
    );
  };

  const indexPatternsService = await getIndexPatternsService();

  // NOTE / TODO: This facade has been put in place to make migrating to the New Platform easier. It
  // removes the need to refactor many layers of dependencies on "req", and instead just augments the top
  // level object passed from here. The layers should be refactored fully at some point, but for now
  // this works and we are still using the New Platform services for these vis data portions.
  const reqFacade: ReqFacade<{}> = {
    requestContext,
    ...request,
    framework,
    payload: {},
    pre: {
      indexPatternsFetcher: new IndexPatternsFetcher(
        requestContext.core.elasticsearch.client.asCurrentUser
      ),
    },
    getUiSettingsService: () => requestContext.core.uiSettings.client,
    getSavedObjectsClient: () => requestContext.core.savedObjects.client,
    getEsShardTimeout: async () => {
      return await framework.globalConfig$
        .pipe(
          first(),
          map((config) => config.elasticsearch.shardTimeout.asMilliseconds())
        )
        .toPromise();
    },
    getIndexPatternsService: async () => indexPatternsService,
  };

  if (!indexPatternString) {
    const defaultIndexPattern = await indexPatternsService.getDefault();

    indexPatternString = defaultIndexPattern?.title ?? '';
  }

  const {
    searchStrategy,
    capabilities,
  } = (await framework.searchStrategyRegistry.getViableStrategy(reqFacade, indexPatternString))!;

  const fields = await searchStrategy.getFieldsForWildcard(
    reqFacade,
    indexPatternString,
    capabilities
  );

  return uniqBy(fields, (field) => field.name);
}
