/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MSearchResult, SearchQuery } from '../../common';
import type { ContentRegistry } from './registry';
import type { StorageContext } from './types';
export declare class MSearchService {
  private readonly deps;
  constructor(deps: {
    getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
    contentRegistry: ContentRegistry;
    getConfig: {
      listingLimit: () => Promise<number>;
      perPage: () => Promise<number>;
    };
  });
  search(
    contentTypes: Array<{
      contentTypeId: string;
      ctx: StorageContext;
    }>,
    query: SearchQuery
  ): Promise<MSearchResult>;
}
