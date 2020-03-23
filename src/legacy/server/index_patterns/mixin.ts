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

import { IndexPatternsFetcher } from '../../../plugins/data/server';
import KbnServer from '../kbn_server';
import { APICaller, CallAPIOptions } from '../../../core/server';
import { Legacy } from '../../../../kibana';

export function indexPatternsMixin(kbnServer: KbnServer, server: Legacy.Server) {
  /**
   *  Create an instance of the IndexPatternsService
   *
   *  @method server.indexPatternsServiceFactory
   *  @type {IndexPatternsService}
   */
  server.decorate('server', 'indexPatternsServiceFactory', ({ callCluster }) => {
    return new IndexPatternsFetcher(callCluster);
  });

  /**
   *  Get an instance of the IndexPatternsService configured for use
   *  the current request
   *
   *  @method request.getIndexPatternsService
   *  @type {IndexPatternsService}
   */
  server.addMemoizedFactoryToRequest('getIndexPatternsService', (request: Legacy.Request) => {
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
    const callCluster: APICaller = (
      endpoint: string,
      params?: Record<string, any>,
      options?: CallAPIOptions
    ) => callWithRequest(request, endpoint, params, options);
    return server.indexPatternsServiceFactory({ callCluster });
  });
}

export type IndexPatternsServiceFactory = (args: {
  callCluster: (endpoint: string, clientParams: any, options: any) => Promise<any>;
}) => IndexPatternsFetcher;
