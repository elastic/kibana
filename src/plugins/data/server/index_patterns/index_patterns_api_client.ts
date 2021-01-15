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
  FieldDescriptor,
  ValidatePatternListActive,
} from '../../common/index_patterns/types';
import { IndexPatternsFetcher } from './fetcher';
import { combineFields, formatIndexFields } from './utils';

export class IndexPatternsApiServer implements IIndexPatternsApiClient {
  esClient: ElasticsearchClient;
  constructor(elasticsearchClient: ElasticsearchClient) {
    this.esClient = elasticsearchClient;
  }
  async validatePatternListActive({ patternList, allowNoIndex }: ValidatePatternListActive) {
    console.log('IndexPatternsApiServer validatePatternListActive MYSTERY HIT');
  }
  async getFieldsForWildcard({
    allowNoIndex,
    formatFields,
    metaFields,
    patternList,
    rollupIndex,
    type,
  }: GetFieldsOptions) {
    console.log('IndexPatternsApiServer getFieldsForWildcard MYSTERY HIT');
    const indexPatterns = new IndexPatternsFetcher(this.esClient, allowNoIndex);
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
    return !formatFields
      ? combineFields(responsesIndexFields)
      : formatIndexFields(responsesIndexFields, patternList);
  }
  async getFieldsForTimePattern(options: GetFieldsOptionsTimePattern) {
    const indexPatterns = new IndexPatternsFetcher(this.esClient);
    return await indexPatterns.getFieldsForTimePattern(options);
  }
}
