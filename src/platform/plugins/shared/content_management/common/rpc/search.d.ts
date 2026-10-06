/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
export declare const searchQuerySchema: import('@kbn/config-schema').Type<
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
export declare const searchResultSchema: import('@kbn/config-schema').ObjectType<{
  hits: import('@kbn/config-schema').Type<any[]>;
  pagination: import('@kbn/config-schema').ObjectType<{
    total: import('@kbn/config-schema').Type<number>;
    cursor: import('@kbn/config-schema').Type<string | undefined>;
  }>;
}>;
export declare const searchSchemas: {
  in: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    version: import('@kbn/config-schema').Type<number>;
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
    options: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
  out: import('@kbn/config-schema').ObjectType<{
    contentTypeId: import('@kbn/config-schema').Type<string>;
    result: import('@kbn/config-schema').ObjectType<{
      hits: import('@kbn/config-schema').Type<any[]>;
      pagination: import('@kbn/config-schema').ObjectType<{
        total: import('@kbn/config-schema').Type<number>;
        cursor: import('@kbn/config-schema').Type<string | undefined>;
      }>;
    }>;
    meta: import('@kbn/config-schema').Type<Readonly<{} & {}> | undefined>;
  }>;
};
export interface SearchQuery {
  /** The text to search for */
  text?: string;
  /** List of tags id to include and exclude */
  tags?: {
    included?: string[];
    excluded?: string[];
  };
  /** The number of result to return */
  limit?: number;
  /** The cursor for this query. Can be a page number or a cursor */
  cursor?: string;
}
export interface SearchIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  query: SearchQuery;
  version?: Version;
  options?: Options;
}
export type SearchResult<T = unknown, M = void> = M extends void
  ? {
      hits: T[];
      pagination: {
        total: number;
        /** Page number or cursor */
        cursor?: string;
      };
    }
  : {
      hits: T[];
      pagination: {
        total: number;
        /** Page number or cursor */
        cursor?: string;
      };
      meta: M;
    };
