/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import type {
  DataView,
  DataViewApiResponse,
  DataViewStatusResponse,
  GetDataViewsResponse,
  GetDataViewResponse,
} from './types';

export type { DataView } from './types';

/**
 * Data Views API Service
 * Provides methods to interact with Kibana's Data Views API
 */
export interface DataViewsApiService {
  /**
   * Get all data views
   * @returns Promise with array of data views and status
   */
  getAll: (spaceId?: string) => Promise<DataViewApiResponse<DataView[]>>;

  /**
   * Get a single data view by ID
   * @param id - The data view ID
   * @param spaceId - Optional space ID
   * @returns Promise with the data view and status
   */
  get: (id: string, spaceId?: string) => Promise<DataViewApiResponse<DataView>>;

  /**
   * Delete a data view by ID
   * @param id - The data view ID to delete
   * @param spaceId - Optional space ID
   * @returns Promise with status code
   */
  delete: (id: string, spaceId?: string) => Promise<DataViewStatusResponse>;

  /**
   * Find data views that match a predicate function
   * @param predicate - Function to filter data views
   * @param spaceId - Optional space ID
   * @returns Promise with filtered array of data views and status
   */
  find: (
    predicate: (dataView: DataView) => boolean,
    spaceId?: string
  ) => Promise<DataViewApiResponse<DataView[]>>;

  /**
   * Delete a data view by its title (convenience method)
   * Finds the first data view matching the title and deletes it
   * @param title - The data view title to search for
   * @param spaceId - Optional space ID
   * @returns Promise with status code
   */
  deleteByTitle: (title: string, spaceId?: string) => Promise<DataViewStatusResponse>;

  /**
   * Get data view ID by title (optionally within a space)
   */
  getIdByTitle: (title: string, spaceId?: string) => Promise<string>;
}

/**
 * Factory function to create a Data Views API service helper
 * @param log - Scout logger instance
 * @param kbnClient - Kibana client for making API requests
 * @returns DataViewsApiService instance
 */
export const getDataViewsApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): DataViewsApiService => {
  const withSpace = (path: string, spaceId?: string) => (spaceId ? `/s/${spaceId}${path}` : path);

  return {
    getAll: async (spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        'dataViewsApi.getAll',
        async (): Promise<DataViewApiResponse<DataView[]>> => {
          const response = await kbnClient.request<GetDataViewsResponse>({
            method: 'GET',
            path: withSpace('/api/data_views', spaceId),
            retries: 3,
          });

          return {
            data: response.data.data_view || [],
            status: response.status,
          };
        }
      );
    },

    get: async (id: string, spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        'dataViewsApi.get',
        async (): Promise<DataViewApiResponse<DataView>> => {
          const response = await kbnClient.request<GetDataViewResponse>({
            method: 'GET',
            path: withSpace(`/api/data_views/data_view/${id}`, spaceId),
            retries: 3,
            ignoreErrors: [404],
          });

          return {
            data: response.data.data_view,
            status: response.status,
          };
        }
      );
    },

    delete: async (id: string, spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        'dataViewsApi.delete',
        async (): Promise<DataViewStatusResponse> => {
          const response = await kbnClient.request({
            method: 'DELETE',
            path: withSpace(`/api/data_views/data_view/${id}`, spaceId),
            retries: 3,
            ignoreErrors: [404],
          });

          return {
            status: response.status,
          };
        }
      );
    },

    find: async (predicate: (dataView: DataView) => boolean, spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        'dataViewsApi.find',
        async (): Promise<DataViewApiResponse<DataView[]>> => {
          const response = await kbnClient.request<GetDataViewsResponse>({
            method: 'GET',
            path: withSpace('/api/data_views', spaceId),
            retries: 3,
          });

          const allDataViews = response.data.data_view || [];
          const filteredDataViews = allDataViews.filter(predicate);

          return {
            data: filteredDataViews,
            status: response.status,
          };
        }
      );
    },

    deleteByTitle: async (title: string, spaceId?: string) => {
      return await measurePerformanceAsync(
        log,
        'dataViewsApi.deleteByTitle',
        async (): Promise<DataViewStatusResponse> => {
          const response = await kbnClient.request<GetDataViewsResponse>({
            method: 'GET',
            path: withSpace('/api/data_views', spaceId),
            retries: 3,
          });

          const allDataViews = response.data.data_view || [];
          const dataView = allDataViews.find((dv) => dv.title === title);

          // Early return if no data view found - not an error condition
          if (!dataView) {
            return { status: 200 };
          }

          const deleteResponse = await kbnClient.request({
            method: 'DELETE',
            path: withSpace(`/api/data_views/data_view/${dataView.id}`, spaceId),
            retries: 3,
            ignoreErrors: [404],
          });

          return {
            status: deleteResponse.status,
          };
        }
      );
    },

    getIdByTitle: async (title: string, spaceId?: string) => {
      return await measurePerformanceAsync(log, 'dataViewsApi.getIdByTitle', async () => {
        const response = await kbnClient.request<GetDataViewsResponse>({
          method: 'GET',
          path: withSpace('/api/data_views', spaceId),
          retries: 3,
        });
        const match = (response.data.data_view || []).find(
          (dataView) => dataView.title === title || dataView.name === title
        );
        if (!match?.id) {
          throw new Error(
            `Data view "${title}" not found${spaceId ? ` in space "${spaceId}"` : ''}`
          );
        }
        return match.id;
      });
    },
  };
};
