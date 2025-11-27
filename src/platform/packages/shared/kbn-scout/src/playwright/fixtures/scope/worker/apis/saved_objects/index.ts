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
import type { SavedObjectsApiService } from './types';

export const getSavedObjectsApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): SavedObjectsApiService => {
  const buildSpacePath = (spaceId?: string, path: string = '') => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}${path}` : path;
  };

  return {
    create: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.create [${params.type}/${params.id || 'auto'}]`,
        async () => {
          log.debug(
            `Creating saved object of type '${params.type}'${
              params.id ? ` with ID '${params.id}'` : ''
            } in space '${spaceId || 'default'}'`
          );
          const path = params.id ? `${params.type}/${params.id}` : params.type;
          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/${path}`,
            retries: 3,
            query: params.overwrite ? { overwrite: 'true' } : undefined,
            body: {
              attributes: params.attributes,
              ...(params.initialNamespaces && { initialNamespaces: params.initialNamespaces }),
            },
            ignoreErrors: [409, 400],
          });

          if (response.status === 200 || response.status === 201) {
            log.debug(
              `Created saved object of type '${params.type}' with ID '${
                response.data.id
              }' in space '${spaceId || 'default'}'`
            );
          }

          return { data: response.data, status: response.status };
        }
      );
    },

    get: async (type, id, spaceId) => {
      return await measurePerformanceAsync(log, `savedObjectsApi.get [${type}/${id}]`, async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/saved_objects/${type}/${id}`,
          retries: 3,
          ignoreErrors: [404],
        });
        return { data: response.data, status: response.status };
      });
    },

    update: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.update [${params.type}/${params.id}]`,
        async () => {
          const response = await kbnClient.request({
            method: 'PUT',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/${params.type}/${params.id}`,
            retries: 3,
            query: params.upsert ? { upsert: 'true' } : undefined,
            body: {
              attributes: params.attributes,
            },
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    delete: async (type, id, spaceId, force) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.delete [${type}/${id}]`,
        async () => {
          const response = await kbnClient.request({
            method: 'DELETE',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/${type}/${id}`,
            retries: 0,
            query: force ? { force: 'true' } : undefined,
            ignoreErrors: [204, 404],
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    bulkCreate: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.bulkCreate [${params.objects.length} objects]`,
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_bulk_create`,
            retries: 3,
            query: params.overwrite ? { overwrite: 'true' } : undefined,
            body: params.objects,
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    bulkGet: async (objects, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.bulkGet [${objects.length} objects]`,
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_bulk_get`,
            retries: 3,
            body: objects,
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    bulkUpdate: async (objects, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.bulkUpdate [${objects.length} objects]`,
        async () => {
          const response = await kbnClient.request({
            method: 'PUT',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_bulk_update`,
            retries: 3,
            body: objects,
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    bulkDelete: async (objects, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.bulkDelete [${objects.length} objects]`,
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_bulk_delete`,
            retries: 0,
            body: objects,
            ignoreErrors: [404],
          });
          return { data: response.data, status: response.status };
        }
      );
    },

    find: async (options, spaceId) => {
      return await measurePerformanceAsync(log, 'savedObjectsApi.find', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `${buildSpacePath(spaceId)}/api/saved_objects/_find`,
          retries: 3,
          query: {
            ...(options.type && { type: options.type }),
            ...(options.search && { search: options.search }),
            ...(options.page && { page: options.page }),
            ...(options.perPage && { per_page: options.perPage }),
            ...(options.fields && { fields: options.fields }),
            ...(options.namespaces && { namespaces: options.namespaces }),
          },
        });
        return { data: response.data, status: response.status };
      });
    },
  };
};
