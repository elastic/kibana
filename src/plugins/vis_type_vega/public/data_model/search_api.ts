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

import { combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CoreStart, IUiSettingsClient } from 'kibana/public';
import {
  getSearchParamsFromRequest,
  SearchRequest,
  DataPublicPluginStart,
  IEsSearchResponse,
} from '../../../data/public';
import { search as dataPluginSearch } from '../../../data/public';
import { VegaInspectorAdapters } from '../vega_inspector';
import { RequestResponder } from '../../../inspector/public';

export interface SearchAPIDependencies {
  uiSettings: IUiSettingsClient;
  injectedMetadata: CoreStart['injectedMetadata'];
  search: DataPublicPluginStart['search'];
}

export class SearchAPI {
  constructor(
    private readonly dependencies: SearchAPIDependencies,
    private readonly abortSignal?: AbortSignal,
    public readonly inspectorAdapters?: VegaInspectorAdapters
  ) {}

  search(searchRequests: SearchRequest[]) {
    const { search } = this.dependencies.search;
    const requestResponders: any = {};

    if (this.inspectorAdapters) {
      this.inspectorAdapters.requests.reset();
    }

    return combineLatest(
      searchRequests.map((request, index) => {
        const requestId = index.toString();
        const params = getSearchParamsFromRequest(request, {
          uiSettings: this.dependencies.uiSettings,
          injectedMetadata: this.dependencies.injectedMetadata,
        });

        if (this.inspectorAdapters) {
          requestResponders[requestId] = this.inspectorAdapters.requests.start(
            `#${requestId}`,
            request
          );
          requestResponders[requestId].json(params.body);
        }

        return search({ params }, { signal: this.abortSignal }).pipe(
          map((data) => ({
            id: requestId,
            rawResponse: data.rawResponse,
          }))
        );
      })
    ).pipe(tap((data) => this.inspectSearchResults(data, requestResponders)));
  }

  private inspectSearchResults(
    requests: IEsSearchResponse[],
    requestResponders: Record<string, RequestResponder>
  ) {
    requests.forEach((request) => {
      if (request.id && requestResponders[request.id]) {
        requestResponders[request.id]
          .stats(dataPluginSearch.getResponseInspectorStats(request.rawResponse))
          .ok({ json: request.rawResponse });
      }
    });
  }
}
