/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { SearchQuery, SearchResult } from './search';
export declare const mSearchSchemas: {
  in: import('@kbn/config-schema').ObjectType<{
    contentTypes: import('@kbn/config-schema').Type<
      Readonly<
        {} & {
          contentTypeId: string;
          version: number;
        }
      >[]
    >;
    query: import('@kbn/config-schema').Type<
      Readonly<
        {
          text?: string | undefined;
          tags?:
            | Readonly<
                {
                  included?: string[] | undefined;
                  excluded?: string[] | undefined;
                } & {}
              >
            | undefined;
          limit?: number | undefined;
          cursor?: string | undefined;
        } & {}
      >
    >;
  }>;
  out: import('@kbn/config-schema').ObjectType<{
    contentTypes: import('@kbn/config-schema').Type<
      Readonly<
        {} & {
          contentTypeId: string;
          version: number;
        }
      >[]
    >;
    result: import('@kbn/config-schema').ObjectType<{
      hits: import('@kbn/config-schema').Type<any[]>;
      pagination: import('@kbn/config-schema').ObjectType<{
        total: import('@kbn/config-schema').Type<number>;
        cursor: import('@kbn/config-schema').Type<string | undefined>;
      }>;
    }>;
  }>;
};
export type MSearchQuery = SearchQuery;
export interface MSearchIn {
  contentTypes: Array<{
    contentTypeId: string;
    version?: Version;
  }>;
  query: MSearchQuery;
}
export type MSearchResult<T = unknown> = SearchResult<T>;
export interface MSearchOut<T = unknown> {
  contentTypes: Array<{
    contentTypeId: string;
    version?: Version;
  }>;
  result: MSearchResult<T>;
}
