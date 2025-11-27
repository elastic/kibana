/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FormData from 'form-data';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';

export interface CreateSavedObjectParams {
  type: string;
  id?: string;
  attributes: Record<string, any>;
  initialNamespaces?: string[];
  overwrite?: boolean;
}

export interface UpdateSavedObjectParams {
  type: string;
  id: string;
  attributes: Record<string, any>;
  upsert?: boolean;
}

export interface BulkCreateSavedObjectsParams {
  objects: Array<{
    type: string;
    id?: string;
    attributes: Record<string, any>;
    initialNamespaces?: string[];
  }>;
  overwrite?: boolean;
}

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export interface ImportSavedObjectsParams {
  objects: Array<{
    type: string;
    id: string;
    attributes: Record<string, any>;
    originId?: string;
    references?: SavedObjectReference[];
  }>;
  overwrite?: boolean;
  createNewCopies?: boolean;
}

export interface ExportSavedObjectsParams {
  objects?: Array<{ type: string; id: string }>;
  type?: string | string[];
  excludeExportDetails?: boolean;
  includeReferencesDeep?: boolean;
}

export interface ImportSavedObjectsResponse {
  success: boolean;
  successCount: number;
  successResults?: Array<{
    type: string;
    id: string;
    destinationId?: string;
    createNewCopy?: boolean;
  }>;
  errors?: Array<{
    type: string;
    id: string;
    error: {
      type: string;
      destinationId?: string;
      destinations?: Array<{ id: string; title: string; updatedAt: string }>;
      references?: SavedObjectReference[];
    };
  }>;
}

export interface ExportedSavedObject {
  type: string;
  id: string;
  attributes: Record<string, any>;
  references?: SavedObjectReference[];
  namespaces?: string[];
  originId?: string;
  updated_at?: string;
}

export interface ExportSavedObjectsResponse {
  exportedObjects: ExportedSavedObject[];
  exportDetails?: {
    exportedCount: number;
    missingRefCount: number;
    missingReferences: Array<{ type: string; id: string }>;
    excludedObjectsCount: number;
    excludedObjects: Array<{ type: string; id: string; reason?: string }>;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export interface SavedObjectsApiService {
  // Note: the create and bulk create operations are deprecated in favor of the import API so they weren't added to the API helper
  get: (type: string, id: string, spaceId?: string) => Promise<ApiResponse>;
  update: (params: UpdateSavedObjectParams, spaceId?: string) => Promise<ApiResponse>;
  delete: (type: string, id: string, spaceId?: string, force?: boolean) => Promise<ApiResponse>;
  bulkGet: (
    objects: Array<{ type: string; id: string; namespaces?: string[] }>,
    spaceId?: string
  ) => Promise<ApiResponse>;
  bulkUpdate: (
    objects: Array<{
      type: string;
      id: string;
      attributes: Record<string, any>;
      namespace?: string;
    }>,
    spaceId?: string
  ) => Promise<ApiResponse>;
  bulkDelete: (
    objects: Array<{ type: string; id: string; force?: boolean }>,
    spaceId?: string
  ) => Promise<ApiResponse>;
  find: (
    options: {
      type?: string | string[];
      search?: string;
      page?: number;
      perPage?: number;
      fields?: string[];
      namespaces?: string[];
    },
    spaceId?: string
  ) => Promise<ApiResponse>;
  import: (
    params: ImportSavedObjectsParams,
    spaceId?: string
  ) => Promise<ApiResponse<ImportSavedObjectsResponse>>;
  export: (
    params: ExportSavedObjectsParams,
    spaceId?: string
  ) => Promise<ApiResponse<ExportSavedObjectsResponse>>;
}

export const getSavedObjectsApiHelper = (
  log: ScoutLogger,
  kbnClient: KbnClient
): SavedObjectsApiService => {
  const buildSpacePath = (spaceId?: string, path: string = '') => {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}${path}` : path;
  };

  // Note: many operations are deprecated, see API specification for guidance
  // Use the non-deprecated methods in your tests where possible
  return {
    import: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.import [${params.objects.length} objects]`,
        async () => {
          log.debug(
            `Importing ${params.objects.length} saved objects into space '${spaceId || 'default'}'${
              params.overwrite ? ' with overwrite' : ''
            }${params.createNewCopies ? ' with createNewCopies' : ''}`
          );

          // Build the NDJSON file content: each object on its own line
          const ndjsonContent = params.objects.map((obj) => JSON.stringify(obj)).join('\n');

          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', ndjsonContent, 'import.ndjson');

          // Build query parameters
          const query: Record<string, boolean> = {};
          if (params.overwrite) {
            query.overwrite = true;
          }
          if (params.createNewCopies) {
            query.createNewCopies = true;
          }

          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_import`,
            retries: 3,
            query,
            body: formData,
            headers: formData.getHeaders(),
            ignoreErrors: [400, 409],
          });

          const importResponse = response.data as any;

          if (response.status === 200) {
            log.debug(
              `Import completed: success=${importResponse.success}, successCount=${importResponse.successCount}`
            );
            if (importResponse.errors && importResponse.errors.length > 0) {
              log.debug(
                `Import had ${importResponse.errors.length} errors: ${JSON.stringify(
                  importResponse.errors.map((e: any) => ({
                    type: e.type,
                    id: e.id,
                    error: e.error.type,
                  }))
                )}`
              );
            }
          }

          return {
            data: importResponse as ImportSavedObjectsResponse,
            status: response.status,
          };
        }
      );
    },
    export: async (params, spaceId) => {
      return await measurePerformanceAsync(
        log,
        `savedObjectsApi.export [${params.objects?.length || 'by type'}]`,
        async () => {
          const exportType = params.objects ? 'specific objects' : `type: ${params.type}`;
          log.debug(
            `Exporting ${exportType} from space '${spaceId || 'default'}'${
              params.includeReferencesDeep ? ' with deep references' : ''
            }`
          );

          const response = await kbnClient.request({
            method: 'POST',
            path: `${buildSpacePath(spaceId)}/api/saved_objects/_export`,
            retries: 3,
            body: {
              ...(params.objects && { objects: params.objects }),
              ...(params.type && { type: params.type }),
              ...(params.excludeExportDetails !== undefined && {
                excludeExportDetails: params.excludeExportDetails,
              }),
              ...(params.includeReferencesDeep !== undefined && {
                includeReferencesDeep: params.includeReferencesDeep,
              }),
            },
            ignoreErrors: [400],
            responseType: 'text',
          });

          // Export returns NDJSON format - parse it
          const ndjsonText =
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          const lines = ndjsonText.split('\n').filter((line) => line.trim());

          // Last line is export details (if not excluded)
          const exportedObjects: ExportedSavedObject[] = [];
          let exportDetails;

          for (let i = 0; i < lines.length; i++) {
            const parsed = JSON.parse(lines[i]);
            // Check if this is the export details object
            if (parsed.exportedCount !== undefined) {
              exportDetails = parsed;
            } else {
              exportedObjects.push(parsed as ExportedSavedObject);
            }
          }

          log.debug(
            `Export completed: ${exportedObjects.length} objects${
              exportDetails ? `, ${exportDetails.exportedCount} total` : ''
            }`
          );

          return {
            data: {
              exportedObjects,
              ...(exportDetails && { exportDetails }),
            } as ExportSavedObjectsResponse,
            status: response.status,
          };
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
