/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ElasticsearchClient } from '../../../../core/server/elasticsearch/client/types';
import type { SavedObjectsClientContract } from '../../../../core/server/saved_objects/types';
import { IndexPatternMissingIndices } from '../../common/index_patterns/lib/errors';
import type {
  GetFieldsOptions,
  GetFieldsOptionsTimePattern,
  IIndexPatternsApiClient,
} from '../../common/index_patterns/types';
import { IndexPatternsFetcher } from './fetcher/index_patterns_fetcher';
import { hasUserIndexPattern } from './has_user_index_pattern';

export class IndexPatternsApiServer implements IIndexPatternsApiClient {
  esClient: ElasticsearchClient;
  constructor(
    elasticsearchClient: ElasticsearchClient,
    private readonly savedObjectsClient: SavedObjectsClientContract
  ) {
    this.esClient = elasticsearchClient;
  }
  async getFieldsForWildcard({
    pattern,
    metaFields,
    type,
    rollupIndex,
    allowNoIndex,
  }: GetFieldsOptions) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient, allowNoIndex);
    return await indexPatterns
      .getFieldsForWildcard({
        pattern,
        metaFields,
        type,
        rollupIndex,
      })
      .catch((err) => {
        if (
          err.output.payload.statusCode === 404 &&
          err.output.payload.code === 'no_matching_indices'
        ) {
          throw new IndexPatternMissingIndices(pattern);
        } else {
          throw err;
        }
      });
  }
  async getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
    return await indexPatterns.getFieldsForTimePattern(options);
  }

  async hasUserIndexPattern() {
    return hasUserIndexPattern({
      esClient: this.esClient,
      soClient: this.savedObjectsClient,
    });
  }
}
