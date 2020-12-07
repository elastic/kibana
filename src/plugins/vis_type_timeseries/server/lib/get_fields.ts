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
import { uniqBy, get } from 'lodash';
import { first, map } from 'rxjs/operators';
import { KibanaRequest, RequestHandlerContext } from 'kibana/server';

import { Framework } from '../plugin';
import {
  indexPatterns,
  IndexPatternFieldDescriptor,
  IndexPatternsFetcher,
} from '../../../data/server';
import { ReqFacade } from './search_strategies/strategies/abstract_search_strategy';

export async function getFields(
  requestContext: RequestHandlerContext,
  request: KibanaRequest,
  framework: Framework,
  indexPattern: string
) {
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
      indexPatternsService: new IndexPatternsFetcher(
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
  };
  let indexPatternString = indexPattern;

  if (!indexPatternString) {
    const [{ savedObjects, elasticsearch }, { data }] = await framework.core.getStartServices();
    const savedObjectsClient = savedObjects.getScopedClient(request);
    const clusterClient = elasticsearch.client.asScoped(request).asCurrentUser;
    const indexPatternsService = await data.indexPatterns.indexPatternsServiceFactory(
      savedObjectsClient,
      clusterClient
    );
    const defaultIndexPattern = await indexPatternsService.getDefault();
    indexPatternString = get(defaultIndexPattern, 'title', '');
  }

  const {
    searchStrategy,
    capabilities,
  } = (await framework.searchStrategyRegistry.getViableStrategy(reqFacade, indexPatternString))!;

  const fields = ((await searchStrategy.getFieldsForWildcard(
    reqFacade,
    indexPatternString,
    capabilities
  )) as IndexPatternFieldDescriptor[]).filter(
    (field) => field.aggregatable && !indexPatterns.isNestedField(field)
  );

  return uniqBy(fields, (field) => field.name);
}
