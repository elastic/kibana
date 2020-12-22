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

import { CoreSetup, KibanaRequest } from 'kibana/server';
import { ISessionService, ISessionServiceDependencies } from './types';
import { DataPluginStart } from '../../plugin';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptions,
} from '../../../common';

/**
 * The OSS session service. See data_enhanced in X-Pack for the background session service.
 */
export class SessionService implements ISessionService {
  protected searchAsScoped!: (request: KibanaRequest) => ISearchClient;

  constructor() {}

  public setup(core: CoreSetup<{}, DataPluginStart>) {
    core.getStartServices().then(([, , dataStart]) => {
      this.searchAsScoped = dataStart.search.asScoped;
    });
  }

  public start() {}

  public stop() {}

  /**
   * Forward this search request to the search service, removing the sessionId (so the search client
   * doesn't forward back to this service).
   */
  private search<Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    { searchClient }: ISessionServiceDependencies,
    request: Request,
    { sessionId, ...options }: ISearchOptions
  ) {
    return searchClient.search<Request, Response>(request, options);
  }

  /**
   * Forward this search request to the search service, removing the sessionId (so the search client
   * doesn't forward back to this service).
   */
  private cancel(
    { searchClient }: ISessionServiceDependencies,
    id: string,
    { sessionId, ...options }: ISearchOptions = {}
  ) {
    return searchClient.cancel(id, options);
  }

  public asScopedProvider() {
    return (request: KibanaRequest) => {
      const searchClient = this.searchAsScoped(request);
      const deps = { searchClient };
      return {
        search: <Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
          searchRequest: Request,
          options: ISearchOptions = {}
        ) => this.search<Request, Response>(deps, searchRequest, options),
        cancel: this.cancel.bind(this, deps),
      };
    };
  }
}
