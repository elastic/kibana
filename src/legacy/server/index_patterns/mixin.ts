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

import Hapi from 'hapi';
import { APICaller } from 'src/core/server';
import { Legacy } from 'kibana';
import KbnServer from 'src/legacy/server/kbn_server';
import { IndexPatternsService } from './service';

import { createFieldsForWildcardRoute, createFieldsForTimePatternRoute } from './routes';

export type IndexPatternsServiceFactory = (args: {
  callCluster: (endpoint: string, clientParams: any, options: any) => Promise<any>;
}) => IndexPatternsService;

interface IndexPatternRequest extends Legacy.Request {
  getIndexPatternsService: () => IndexPatternsService;
}

interface ServerWithFactory extends Legacy.Server {
  addMemoizedFactoryToRequest: (...args: any) => void;
}

export function indexPatternsMixin(kbnServer: KbnServer, server: ServerWithFactory) {
  const pre: Record<string, Hapi.RouteOptionsPreAllOptions> = {
    /**
     *  Create an instance of the `indexPatterns` service
     *  @type {Hapi.Pre}
     */
    getIndexPatternsService: {
      assign: 'indexPatterns',
      method(request: IndexPatternRequest) {
        return request.getIndexPatternsService();
      },
    },
  };

  /**
   *  Create an instance of the IndexPatternsService
   *
   *  @method server.indexPatternsServiceFactory
   *  @type {IndexPatternsService}
   */
  server.decorate(
    'server',
    'indexPatternsServiceFactory',
    ({ callCluster }: { callCluster: APICaller }) => {
      return new IndexPatternsService(callCluster);
    }
  );

  /**
   *  Get an instance of the IndexPatternsService configured for use
   *  the current request
   *
   *  @method request.getIndexPatternsService
   *  @type {IndexPatternsService}
   */
  server.addMemoizedFactoryToRequest('getIndexPatternsService', (request: Legacy.Request) => {
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
    const callCluster = (endpoint: string, params: any, options: any) =>
      callWithRequest(request, endpoint, params, options);
    return server.indexPatternsServiceFactory({ callCluster });
  });

  server.route(createFieldsForWildcardRoute(pre));
  server.route(createFieldsForTimePatternRoute(pre));
}
