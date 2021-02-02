/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';
import {
  GetFieldsOptions,
  IIndexPatternsApiClient,
  GetFieldsOptionsTimePattern,
} from '../../common/index_patterns/types';
import { IndexPatternsFetcher } from './fetcher';

export class IndexPatternsApiServer implements IIndexPatternsApiClient {
  esClient: ElasticsearchClient;
  constructor(elasticsearchClient: ElasticsearchClient) {
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
    return await indexPatterns.getFieldsForWildcard({
      pattern,
      metaFields,
      type,
      rollupIndex,
    });
  }
  async getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
    return await indexPatterns.getFieldsForTimePattern(options);
  }
}
