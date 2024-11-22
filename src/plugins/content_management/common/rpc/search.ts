/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Version } from '@kbn/object-versioning';
import { versionSchema } from './constants';

import type { ProcedureSchemas } from './types';

export const searchQuerySchema = schema.oneOf([
  schema.object(
    {
      text: schema.maybe(schema.string()),
      tags: schema.maybe(
        schema.object({
          included: schema.maybe(schema.arrayOf(schema.string())),
          excluded: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
      limit: schema.maybe(schema.number()),
      cursor: schema.maybe(schema.string()),
    },
    {
      unknowns: 'forbid',
    }
  ),
]);

export const searchResultSchema = schema.object({
  hits: schema.arrayOf(schema.any()),
  pagination: schema.object({
    total: schema.number(),
    cursor: schema.maybe(schema.string()),
  }),
});

export const searchSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypeId: schema.string(),
      version: versionSchema,
      query: searchQuerySchema,
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object(
    {
      contentTypeId: schema.string(),
      result: searchResultSchema,
      meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
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
