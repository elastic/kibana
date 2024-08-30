/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';

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
