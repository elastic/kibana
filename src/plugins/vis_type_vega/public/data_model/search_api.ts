/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, from } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { CoreStart, IUiSettingsClient } from 'kibana/public';
import type { RuntimeFields } from '@elastic/elasticsearch/api/types';
import { getData } from '../services';
import {
  getSearchParamsFromRequest,
  SearchRequest,
  DataPublicPluginStart,
  IEsSearchResponse,
  IndexPattern,
} from '../../../data/public';
import { search as dataPluginSearch } from '../../../data/public';
import { ISearchRequestParams } from '../../../data/common';
import { VegaInspectorAdapters } from '../vega_inspector';
import { RequestResponder } from '../../../inspector/public';

const extendSearchParamsWithRuntimeFields = (requestParams: ISearchRequestParams) =>
  new Promise(async (resolve) => {
    const indexPatternTitle = requestParams.index as string;
    const indexPatterns = await getData().indexPatterns.find(indexPatternTitle);
    const indexPattern = indexPatterns.find(
      (index: IndexPattern) => index.title === indexPatternTitle
    );
    const runtimeFields = indexPattern?.getComputedFields().runtimeFields as RuntimeFields;

    resolve({
      ...requestParams,
      body: { ...requestParams.body, runtime_mappings: runtimeFields ?? undefined },
    });
  });

export interface SearchAPIDependencies {
  uiSettings: IUiSettingsClient;
  injectedMetadata: CoreStart['injectedMetadata'];
  search: DataPublicPluginStart['search'];
}

export class SearchAPI {
  constructor(
    private readonly dependencies: SearchAPIDependencies,
    private readonly abortSignal?: AbortSignal,
    public readonly inspectorAdapters?: VegaInspectorAdapters,
    private readonly searchSessionId?: string
  ) {}

  search(searchRequests: SearchRequest[]) {
    const { search } = this.dependencies;
    const requestResponders: any = {};

    return combineLatest(
      searchRequests.map((request) => {
        const requestId = request.name;
        const requestParams = getSearchParamsFromRequest(request, {
          getConfig: this.dependencies.uiSettings.get.bind(this.dependencies.uiSettings),
        });

        if (this.inspectorAdapters) {
          requestResponders[requestId] = this.inspectorAdapters.requests.start(requestId, {
            ...request,
            searchSessionId: this.searchSessionId,
          });
          requestResponders[requestId].json(requestParams.body);
        }

        return from(extendSearchParamsWithRuntimeFields(requestParams)).pipe(
          switchMap((params) =>
            search
              .search(
                { params },
                { abortSignal: this.abortSignal, sessionId: this.searchSessionId }
              )
              .pipe(
                tap((data) => this.inspectSearchResult(data, requestResponders[requestId])),
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
