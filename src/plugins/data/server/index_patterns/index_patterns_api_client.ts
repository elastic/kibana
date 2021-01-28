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
  FieldDescriptor,
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
    if (formatFields) {
      // need to know which pattern the field is from in order to properly format
      // so we split up the requests for each pattern in the patternList
      const fieldsArr: Array<FieldDescriptor[] | boolean> = await Promise.all(
        patternList
          .map((pattern) =>
            indexPatterns.getFieldsForWildcard({
              metaFields,
              pattern,
              rollupIndex,
              type,
            })
          )
          .map((p) => p.catch(() => false))
      );
      const responsesIndexFields = fieldsArr.filter((rif) => rif !== false) as FieldDescriptor[][];
      return formatIndexFields(responsesIndexFields, patternList);
    }
    return indexPatterns.getFieldsForWildcard({
      metaFields,
      pattern: patternList.join(','),
      rollupIndex,
      type,
    });
  }
  async getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
    return await indexPatterns.getFieldsForTimePattern(options);
  }
}
