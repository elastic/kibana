/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsRawDocSource } from '../..';

/**
 * Options for the saved objects raw search operation.
 *
 * @public
 */
export interface SavedObjectsSearchOptions extends Omit<estypes.SearchRequest, 'index'> {
  /** The type or types of objects to find. */
  type: string | string[];

  /** The namespaces to search within. */
  namespaces: string[];
}

/**
 * Response from the saved objects raw search operation.
 */
export type SavedObjectsSearchResponse<
  Document extends SavedObjectsRawDocSource = SavedObjectsRawDocSource,
  Aggregations = unknown
> = estypes.SearchResponse<Document, Aggregations>;
