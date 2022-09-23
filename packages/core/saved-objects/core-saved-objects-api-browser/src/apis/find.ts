/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindOptions as SavedObjectFindOptionsServer } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsBatchResponse } from './base';

/**
 * @public
 */
export type SavedObjectsFindOptions = Omit<
  SavedObjectFindOptionsServer,
  'pit' | 'rootSearchFields' | 'searchAfter' | 'sortOrder' | 'typeToNamespacesMap'
>;

/**
 * Return type of the Saved Objects `find()` method.
 *
 * @public
 */
export interface SavedObjectsFindResponse<T = unknown, A = unknown>
  extends SavedObjectsBatchResponse<T> {
  aggregations?: A;
  total: number;
  perPage: number;
  page: number;
}

/**
 * @public
 */
export interface SavedObjectsFindOptionsReference {
  type: string;
  id: string;
}
