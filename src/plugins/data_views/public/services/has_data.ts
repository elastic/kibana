/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpStart } from '@kbn/core/public';
import { DEFAULT_ASSETS_TO_IGNORE } from '../../common';
import { HasDataViewsResponse, IndicesViaSearchResponse } from '..';
import { IndicesResponse, IndicesResponseModified } from '../types';

export class HasData {
  private removeAliases = (source: IndicesResponseModified): boolean => !source.item.indices;

  private isUserDataIndex = (source: IndicesResponseModified): boolean => {
    // filter out indices that start with `.`
    if (source.name.startsWith('.')) return false;

    // filter out sources from DEFAULT_ASSETS_TO_IGNORE
    if (source.name === DEFAULT_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE) return false;
    if (source.name === DEFAULT_ASSETS_TO_IGNORE.ENT_SEARCH_LOGS_DATA_STREAM_TO_IGNORE)
      return false;

    return true;
  };

  start(core: CoreStart) {
    const { http } = core;
    return {
      /**
       * Check to see if ES data exists
       */
      hasESData: async (): Promise<boolean> => {
        const hasLocalESData = await this.checkLocalESData(http);
        if (!hasLocalESData) {
          const hasRemoteESData = await this.checkRemoteESData(http);
          return hasRemoteESData;
        }
        return hasLocalESData;
      },
      /**
       * Check to see if a data view exists
       */
      hasDataView: async (): Promise<boolean> => {
        const dataViewsCheck = await this.findDataViews(http);
        return dataViewsCheck;
      },
      /**
       * Check to see if user created data views exist
       */
      hasUserDataView: async (): Promise<boolean> => {
        const userDataViewsCheck = await this.findUserDataViews(http);
        return userDataViewsCheck;
      },
    };
  }

  // ES Data

  private responseToItemArray = (response: IndicesResponse): IndicesResponseModified[] => {
    const { indices = [], aliases = [] } = response;
    const source: IndicesResponseModified[] = [];

    [...indices, ...aliases, ...(response.data_streams || [])].forEach((item) => {
      source.push({
        name: item.name,
        item,
      });
    });

    return source;
  };

  private getIndicesViaSearch = async ({
    http,
    pattern,
    showAllIndices,
  }: {
    http: HttpStart;
    pattern: string;
    showAllIndices: boolean;
  }): Promise<boolean> =>
    http
      .post<IndicesViaSearchResponse>(`/internal/search/ese`, {
        body: JSON.stringify({
          params: {
            ignore_unavailable: true,
            expand_wildcards: showAllIndices ? 'all' : 'open',
            index: pattern,
            body: {
              size: 0, // no hits
              aggs: {
                indices: {
                  terms: {
                    field: '_index',
                    size: 200,
                  },
                },
              },
            },
          },
        }),
      })
      .then((resp) => {
        return !!(resp && resp.total >= 0);
      })
      .catch(() => false);

  private getIndices = async ({
    http,
    pattern,
    showAllIndices,
  }: {
    http: HttpStart;
    pattern: string;
    showAllIndices: boolean;
  }): Promise<IndicesResponseModified[]> =>
    http
      .get<IndicesResponse>(`/internal/index-pattern-management/resolve_index/${pattern}`, {
        query: showAllIndices ? { expand_wildcards: 'all' } : undefined,
      })
      .then((response) => {
        if (!response) {
          return [];
        } else {
          return this.responseToItemArray(response);
        }
      });

  private checkLocalESData = (http: HttpStart): Promise<boolean> =>
    this.getIndices({
      http,
      pattern: '*',
      showAllIndices: false,
    })
      .then((dataSources: IndicesResponseModified[]) => {
        return dataSources.some(this.isUserDataIndex);
      })
      .catch(() => this.getIndicesViaSearch({ http, pattern: '*', showAllIndices: false }));

  private checkRemoteESData = (http: HttpStart): Promise<boolean> =>
    this.getIndices({
      http,
      pattern: '*:*',
      showAllIndices: false,
    })
      .then((dataSources: IndicesResponseModified[]) => {
        return !!dataSources.filter(this.removeAliases).length;
      })
      .catch(() => this.getIndicesViaSearch({ http, pattern: '*:*', showAllIndices: false }));

  // Data Views

  private getHasDataViews = async ({ http }: { http: HttpStart }): Promise<HasDataViewsResponse> =>
    http.get<HasDataViewsResponse>(`/internal/data_views/has_data_views`);

  private findDataViews = (http: HttpStart): Promise<boolean> => {
    return this.getHasDataViews({ http })
      .then((response: HasDataViewsResponse) => {
        const { hasDataView } = response;
        return hasDataView;
      })
      .catch(() => false);
  };

  private findUserDataViews = (http: HttpStart): Promise<boolean> => {
    return this.getHasDataViews({ http })
      .then((response: HasDataViewsResponse) => {
        const { hasUserDataView } = response;
        return hasUserDataView;
      })
      .catch(() => false);
  };
}

export type HasDataStart = ReturnType<HasData['start']>;
