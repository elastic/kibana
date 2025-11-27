/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export interface SavedObjectsApiService {
  create: (params: CreateSavedObjectParams, spaceId?: string) => Promise<ApiResponse>;
  get: (type: string, id: string, spaceId?: string) => Promise<ApiResponse>;
  update: (params: UpdateSavedObjectParams, spaceId?: string) => Promise<ApiResponse>;
  delete: (type: string, id: string, spaceId?: string, force?: boolean) => Promise<ApiResponse>;
  bulkCreate: (params: BulkCreateSavedObjectsParams, spaceId?: string) => Promise<ApiResponse>;
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
}
