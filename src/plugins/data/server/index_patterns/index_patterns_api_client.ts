/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  async getFieldsForWildcard({ pattern, metaFields, type, rollupIndex }: GetFieldsOptions) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
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
