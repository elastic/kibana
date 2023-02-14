/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FindSearchOperatorHTTP,
  FindSortOrderHTTP,
  ReferenceHTTP,
  SavedObjectWithMetadata,
} from '@kbn/saved-objects-management-plugin/common/types/v1';

export interface FindQueryHTTP {
  perPage?: number;
  page?: number;
  type: string | string[];
  // TODO: Fix. this API allows writing an arbitrary query that is passed straight to our persistence layer, thus leaking SO attributes to the public...
  search?: string;
  defaultSearchOperator?: FindSearchOperatorHTTP;
  // TODO: Fix. this API allows sorting by any field, thus leaking SO attributes to the public...
  sortField?: string;
  sortOrder?: FindSortOrderHTTP;
  hasReference?: ReferenceHTTP | ReferenceHTTP[];
  hasReferenceOperator?: FindSearchOperatorHTTP;
  // TODO: Fix. This exposes attribute schemas to clients.
  fields?: string | string[];
}

export interface FinderAttributes {
  title?: string;
  name?: string;
  type: string;
}

export interface FindResponseHTTP {
  saved_objects: Array<SavedObjectWithMetadata<FinderAttributes>>;
  total: number;
  page: number;
  per_page: number;
}
