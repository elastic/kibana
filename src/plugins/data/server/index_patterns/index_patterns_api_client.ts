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
  ValidatePatternListActive,
} from '../../common/index_patterns';
import { IndexPatternsFetcher } from './fetcher';
import { formatIndexFields } from './utils';

export class IndexPatternsApiServer implements IIndexPatternsApiClient {
  esClient: ElasticsearchClient;
  constructor(elasticsearchClient: ElasticsearchClient) {
    this.esClient = elasticsearchClient;
  }
  async validatePatternListActive({ patternList, allowNoIndex }: ValidatePatternListActive) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient, allowNoIndex);
    return indexPatterns.validatePatternListActive(patternList);
  }
  async getFieldsForWildcard({
    allowNoIndex,
    formatFields,
    metaFields,
    patternList,
    rollupIndex,
    type,
  }: GetFieldsOptions) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient, allowNoIndex);
    let fields = await indexPatterns.getFieldsForWildcard({
      metaFields,
      pattern: patternList.join(','),
      rollupIndex,
      type,
    });
    if (formatFields) {
      fields = await formatIndexFields(fields);
    }
    return fields;
  }
  async getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
    return await indexPatterns.getFieldsForTimePattern(options);
  }
}
