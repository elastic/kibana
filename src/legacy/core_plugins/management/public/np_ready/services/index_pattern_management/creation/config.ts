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

import { i18n } from '@kbn/i18n';
import { MatchedIndex } from '../../../../../../kibana/public/management/sections/index_patterns/create_index_pattern_wizard/types';

const indexPatternTypeName = i18n.translate(
  'management.editIndexPattern.createIndex.defaultTypeName',
  { defaultMessage: 'index pattern' }
);

const indexPatternButtonText = i18n.translate(
  'management.editIndexPattern.createIndex.defaultButtonText',
  { defaultMessage: 'Standard index pattern' }
);

const indexPatternButtonDescription = i18n.translate(
  'management.editIndexPattern.createIndex.defaultButtonDescription',
  { defaultMessage: 'Perform full aggregations against any data' }
);

export type UrlHandler = (url: string) => void;

export interface IndexPatternCreationOption {
  text: string;
  description: string;
  testSubj: string;
  onClick: () => void;
  isBeta?: boolean;
}

export class IndexPatternCreationConfig {
  public readonly key = 'default';

  protected type?: string;
  protected name: string;
  protected showSystemIndices: boolean;
  protected httpClient: object | null;
  protected isBeta: boolean;

  constructor({
    type = undefined,
    name = indexPatternTypeName,
    showSystemIndices = true,
    httpClient = null,
    isBeta = false,
  }: {
    type?: string;
    name?: string;
    showSystemIndices?: boolean;
    httpClient?: object | null;
    isBeta?: boolean;
  }) {
    this.type = type;
    this.name = name;
    this.showSystemIndices = showSystemIndices;
    this.httpClient = httpClient;
    this.isBeta = isBeta;
  }

  public async getIndexPatternCreationOption(
    urlHandler: UrlHandler
  ): Promise<IndexPatternCreationOption> {
    return {
      text: indexPatternButtonText,
      description: indexPatternButtonDescription,
      testSubj: `createStandardIndexPatternButton`,
      onClick: () => {
        urlHandler('/management/kibana/index_pattern');
      },
    };
  }

  public getIndexPatternType() {
    return this.type;
  }

  public getIndexPatternName() {
    return this.name;
  }

  public getIsBeta() {
    return this.isBeta;
  }

  public getShowSystemIndices() {
    return this.showSystemIndices;
  }

  public getIndexTags(indexName: string) {
    return [];
  }

  public checkIndicesForErrors(indices: MatchedIndex[]) {
    return undefined;
  }

  public getIndexPatternMappings() {
    return {};
  }

  public renderPrompt() {
    return null;
  }

  public getFetchForWildcardOptions() {
    return {};
  }
}
