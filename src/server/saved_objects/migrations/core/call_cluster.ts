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

/**
 * This file is nothing more than type signatures for the subset of
 * elasticsearch.js that migrations use. There is no actual logic /
 * funcationality contained here.
 */

export interface CallCluster {
  (path: 'bulk', opts: { body: object[] }): Promise<BulkResult>;
  (path: 'count', opts: CountOpts): Promise<{ count: number }>;
  (path: 'clearScroll', opts: { scrollId: string }): Promise<any>;
  (path: 'indices.create' | 'indices.delete', opts: IndexCreationOpts): Promise<any>;
  (path: 'indices.exists', opts: IndexOpts): Promise<boolean>;
  (path: 'indices.existsAlias', opts: { name: string }): Promise<boolean>;
  (path: 'indices.get', opts: IndexOpts & Ignorable): Promise<IndicesInfo | NotFound>;
  (path: 'indices.getAlias', opts: { name: string } & Ignorable): Promise<AliasResult | NotFound>;
  (path: 'indices.getMapping', opts: IndexOpts): Promise<MappingResult>;
  (path: 'indices.getSettings', opts: IndexOpts): Promise<IndexSettingsResult>;
  (path: 'indices.putMapping', opts: PutMappingOpts): Promise<any>;
  (path: 'indices.putTemplate', opts: PutTemplateOpts): Promise<any>;
  (path: 'indices.refresh', opts: IndexOpts): Promise<any>;
  (path: 'indices.updateAliases', opts: UpdateAliasesOpts): Promise<any>;
  (path: 'reindex', opts: ReindexOpts): Promise<any>;
  (path: 'scroll', opts: ScrollOpts): Promise<SearchResults>;
  (path: 'search', opts: SearchOpts): Promise<SearchResults>;
  (path: 'tasks.get', opts: { taskId: string }): Promise<{
    completed: boolean;
    error?: ErrorResponse;
  }>;
}

///////////////////////////////////////////////////////////////////
// callCluster argument type definitions
///////////////////////////////////////////////////////////////////

export interface Ignorable {
  ignore: number[];
}

export interface CountOpts {
  body: {
    query: object;
  };
  index: string;
  type: string;
}

export interface PutMappingOpts {
  body: DocMapping;
  index: string;
  type: string;
}

export interface PutTemplateOpts {
  name: string;
  body: {
    template: string;
    settings: {
      number_of_shards: number;
      auto_expand_replicas: string;
    };
    mappings: IndexMapping;
  };
}

export interface IndexOpts {
  index: string;
}

export interface IndexCreationOpts {
  index: string;
  body?: {
    mappings?: IndexMapping;
    settings?: {
      number_of_shards: number;
      auto_expand_replicas: string;
    };
  };
}

export interface ReindexOpts {
  body: {
    dest: IndexOpts;
    source: IndexOpts & { size: number };
  };
  refresh: boolean;
  waitForCompletion: boolean;
}

export type AliasAction =
  | { remove_index: IndexOpts }
  | { remove: { index: string; alias: string } }
  | { add: { index: string; alias: string } };

export interface UpdateAliasesOpts {
  body: {
    actions: AliasAction[];
  };
}

export interface SearchOpts {
  body: object;
  index: string;
  scroll?: string;
}

export interface ScrollOpts {
  scroll: string;
  scrollId: string;
}

///////////////////////////////////////////////////////////////////
// callCluster result type definitions
///////////////////////////////////////////////////////////////////

export interface NotFound {
  status: 404;
}

export interface MappingResult {
  [index: string]: {
    mappings: IndexMapping;
  };
}

export interface AliasResult {
  [alias: string]: object;
}

export interface IndexSettingsResult {
  [indexName: string]: {
    settings: {
      index: {
        number_of_shards: string;
        auto_expand_replicas: string;
        provided_name: string;
        creation_date: string;
        number_of_replicas: string;
        uuid: string;
        version: { created: '7000001' };
      };
    };
  };
}

export interface RawDoc {
  _id: string;
  _source: any;
  _type?: string;
}

export interface SearchResults {
  hits: {
    hits: RawDoc[];
  };
  _scroll_id?: string;
}

export interface ErrorResponse {
  type: string;
  reason: string;
}

export interface BulkResult {
  items: Array<{ index: { error?: ErrorResponse } }>;
}

export interface IndexInfo {
  aliases: AliasResult;
  mappings: IndexMapping;
}

export interface IndicesInfo {
  [index: string]: IndexInfo;
}

export interface MappingProperties {
  [type: string]: any;
}

export interface DocMapping {
  dynamic: string;
  properties: MappingProperties;
}

export interface IndexMapping {
  doc: DocMapping;
}
