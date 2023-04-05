/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MSearchResult, SearchQuery } from '../../common';
import { ContentRegistry } from './registry';
import { StorageContext } from './types';

export class MSearchService {
  constructor(
    private readonly deps: {
      getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
      contentRegistry: ContentRegistry;
    }
  ) {}

  async search(
    contentTypes: Array<{ id: string; ctx: StorageContext }>,
    query: SearchQuery
  ): Promise<MSearchResult> {
    const contentTypeToCtx = new Map(contentTypes.map((ct) => [ct.id, ct.ctx]));
    const contentTypeToMSearchConfig = new Map(
      contentTypes.map((ct) => {
        const mSearchConfig = this.deps.contentRegistry.getDefinition(ct.id).storage.mSearch;
        if (!mSearchConfig) {
          throw new Error(`Content type ${ct.id} does not support mSearch`);
        }
        return [ct.id, mSearchConfig];
      })
    );
    const soTypeToMSearchConfig = new Map(
      Array.from(contentTypeToMSearchConfig.entries()).map(([ct, mSearchConfig]) => {
        return [mSearchConfig.savedObjectType, [ct, mSearchConfig] as const];
      })
    );

    const mSearchConfigs = Array.from(contentTypeToMSearchConfig.values());
    const soSearchTypes = mSearchConfigs.map((mSearchConfig) => mSearchConfig.savedObjectType);
    const additionalSearchFields = new Set<string>();
    mSearchConfigs.forEach((mSearchConfig) => {
      if (mSearchConfig.additionalSearchFields) {
        mSearchConfig.additionalSearchFields.forEach((f) => additionalSearchFields.add(f));
      }
    });

    const savedObjectsClient = await this.deps.getSavedObjectsClient();
    const soResult = await savedObjectsClient.find({
      type: soSearchTypes,
      search: query.text,
      searchFields: [`title^3`, `description`, ...additionalSearchFields],
      defaultSearchOperator: 'AND',
      // TODO: tags
      // TODO: pagination
      // TODO: sort
    });

    const contentItemHits = soResult.saved_objects.map((savedObject) => {
      const [ct, mSearchConfig] = soTypeToMSearchConfig.get(savedObject.type) ?? [];
      if (!ct || !mSearchConfig)
        throw new Error(`Saved object type ${savedObject.type} does not support mSearch`);

      return mSearchConfig.toItemResult(contentTypeToCtx.get(ct)!, savedObject);
    });

    return {
      hits: contentItemHits,
      pagination: {
        total: soResult.total,
      },
    };
  }
}
