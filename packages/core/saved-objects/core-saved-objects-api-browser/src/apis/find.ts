/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindOptions as SavedObjectFindOptionsServer } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsBatchResponse } from './base';

export type { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-server';

/**
 * Browser options for finding saved objects
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export type SavedObjectsFindOptions = Omit<
  SavedObjectFindOptionsServer,
  | 'pit'
  | 'rootSearchFields'
  | 'searchAfter'
  | 'sortOrder'
  | 'typeToNamespacesMap'
  | 'migrationVersionCompatibility'
>;

/**
 * Return type of the Saved Objects `find()` method.
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsFindResponse<T = unknown, A = unknown>
  extends SavedObjectsBatchResponse<T> {
  /** aggregations from the search query */
  aggregations?: A;
  /** total number of results */
  total: number;
  /** number of results per page */
  perPage: number;
  /** current page in results*/
  page: number;
}
