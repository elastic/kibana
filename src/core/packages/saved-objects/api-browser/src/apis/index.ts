/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SavedObjectsBatchResponse } from './base';
export type { SavedObjectsBulkCreateObject, SavedObjectsBulkCreateOptions } from './bulk_create';
export type { SavedObjectsBulkResolveResponse } from './bulk_resolve';
export type { SavedObjectsBulkUpdateObject, SavedObjectsBulkUpdateOptions } from './bulk_update';
export type { SavedObjectsCreateOptions } from './create';
export type { SavedObjectsDeleteOptions } from './delete';
export type {
  SavedObjectsFindResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
} from './find';
export type { ResolvedSimpleSavedObject } from './resolve';
export type { SavedObjectsUpdateOptions } from './update';
export type {
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponseItem,
  SavedObjectsBulkDeleteResponse,
} from './bulk_delete';
