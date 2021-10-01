/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This file is nothing more than type signatures for the subset of
 * elasticsearch.js that migrations use. There is no actual logic /
 * funcationality contained here.
 */

import type { estypes } from '@elastic/elasticsearch';
import { IndexMapping } from '../../mappings';

export interface CallCluster {
  (path: 'bulk', opts: { body: object[] }): Promise<BulkResult>;
  (path: 'count', opts: CountOpts): Promise<{ count: number; _shards: estypes.ShardStatistics }>;
  (path: 'clearScroll', opts: { scrollId: string }): Promise<any>;
  (path: 'indices.create', opts: IndexCreationOpts): Promise<any>;
  (path: 'indices.exists', opts: IndexOpts): Promise<boolean>;
  (path: 'indices.existsAlias', opts: { name: string }): Promise<boolean>;
  (path: 'indices.get', opts: IndexOpts & Ignorable): Promise<IndicesInfo | NotFound>;
  (path: 'indices.getAlias', opts: { name: string } & Ignorable): Promise<AliasResult | NotFound>;
  (path: 'indices.getMapping', opts: IndexOpts): Promise<MappingResult>;
  (path: 'indices.getSettings', opts: IndexOpts): Promise<IndexSettingsResult>;
  (path: 'indices.refresh', opts: IndexOpts): Promise<any>;
  (path: 'indices.updateAliases', opts: UpdateAliasesOpts): Promise<any>;
  (path: 'indices.deleteTemplate', opts: { name: string }): Promise<any>;
  (path: 'cat.templates', opts: { format: 'json'; name: string }): Promise<Array<{ name: string }>>;
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
}

export interface PutMappingOpts {
  body: IndexMapping;
  index: string;
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
    script?: {
      source: string;
      lang: 'painless';
    };
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
  _id: estypes.Id;
  _source: any;
  _type?: string;
}

export interface SearchResults {
  hits: {
    hits: RawDoc[];
  };
  _scroll_id?: string;
  _shards: estypes.ShardStatistics;
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
