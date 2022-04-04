/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, from } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import type { CoreStart, IUiSettingsClient, KibanaExecutionContext } from 'kibana/public';
import {
  getSearchParamsFromRequest,
  SearchRequest,
  DataPublicPluginStart,
  IEsSearchResponse,
} from '../../../../data/public';
import type { DataViewsPublicPluginStart } from '../../../../data_views/public';
import { search as dataPluginSearch } from '../../../../data/public';
import type { VegaInspectorAdapters } from '../vega_inspector';
import type { RequestResponder } from '../../../../inspector/public';

/** @internal **/
export const extendSearchParamsWithRuntimeFields = async (
  indexPatterns: SearchAPIDependencies['indexPatterns'],
  requestParams: ReturnType<typeof getSearchParamsFromRequest>,
  indexPatternString?: string
) => {
  if (indexPatternString) {
    let runtimeMappings = requestParams.body?.runtime_mappings;

    if (!runtimeMappings) {
      const indexPattern = (await indexPatterns.find(indexPatternString)).find(
        (index) => index.title === indexPatternString
      );
      runtimeMappings = indexPattern?.getRuntimeMappings();
    }

    return {
      ...requestParams,
      body: { ...requestParams.body, runtime_mappings: runtimeMappings },
    };
  }

  return requestParams;
};

export interface SearchAPIDependencies {
  uiSettings: IUiSettingsClient;
  injectedMetadata: CoreStart['injectedMetadata'];
  search: DataPublicPluginStart['search'];
  indexPatterns: DataViewsPublicPluginStart;
}

export class SearchAPI {
  constructor(
    private readonly dependencies: SearchAPIDependencies,
    private readonly abortSignal?: AbortSignal,
    public readonly inspectorAdapters?: VegaInspectorAdapters,
    private readonly searchSessionId?: string,
    private readonly executionContext?: KibanaExecutionContext
  ) {}

  search(searchRequests: SearchRequest[]) {
    const { search, indexPatterns } = this.dependencies;
    const requestResponders: any = {};

    return combineLatest(
      searchRequests.map((request) => {
        const requestId = request.name;
        const requestParams = getSearchParamsFromRequest(request, {
          getConfig: this.dependencies.uiSettings.get.bind(this.dependencies.uiSettings),
        });

        return from(
          extendSearchParamsWithRuntimeFields(indexPatterns, requestParams, request.index)
        ).pipe(
          tap((params) => {
            /** inspect request data **/
            if (this.inspectorAdapters) {
              requestResponders[requestId] = this.inspectorAdapters.requests.start(requestId, {
                ...request,
                searchSessionId: this.searchSessionId,
              });
              requestResponders[requestId].json(params.body);
            }
          }),
          switchMap((params) =>
            search
              .search(
                { params },
                {
                  abortSignal: this.abortSignal,
                  sessionId: this.searchSessionId,
                  executionContext: this.executionContext,
                }
              )
              .pipe(
                tap(
                  (data) => this.inspectSearchResult(data, requestResponders[requestId]),
                  (err) =>
                    this.inspectSearchResult(
                      {
                        rawResponse: err?.err,
                      },
                      requestResponders[requestId]
                    )
                ),
                map((data) => ({
                  name: requestId,
                  rawResponse: data.rawResponse,
                }))
              )
          )
        );
      })
    );
  }

  public resetSearchStats() {
    if (this.inspectorAdapters) {
      this.inspectorAdapters.requests.reset();
    }
  }

  private inspectSearchResult(response: IEsSearchResponse, requestResponder: RequestResponder) {
    if (requestResponder) {
      requestResponder
        .stats(dataPluginSearch.getResponseInspectorStats(response.rawResponse))
        .ok({ json: response.rawResponse });
    }
  }
}
