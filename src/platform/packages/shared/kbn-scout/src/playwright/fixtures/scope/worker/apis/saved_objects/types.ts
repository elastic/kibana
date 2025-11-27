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
