/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { Version } from '@kbn/object-versioning';
import { versionSchema } from './constants';
import { searchQuerySchema, searchResultSchema, SearchQuery, SearchResult } from './search';

import type { ProcedureSchemas } from './types';

export const mSearchSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypes: schema.arrayOf(
        schema.object({ contentTypeId: schema.string(), version: versionSchema }),
        {
          minSize: 1,
        }
      ),
      query: searchQuerySchema,
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object(
    {
      contentTypes: schema.arrayOf(
        schema.object({ contentTypeId: schema.string(), version: versionSchema })
      ),
      result: searchResultSchema,
    },
    { unknowns: 'forbid' }
  ),
};

export type MSearchQuery = SearchQuery;

export interface MSearchIn {
  contentTypes: Array<{ contentTypeId: string; version?: Version }>;
  query: MSearchQuery;
}

export type MSearchResult<T = unknown> = SearchResult<T>;

export interface MSearchIn<Options extends void | object = object> {
  contentTypes: Array<{ contentTypeId: string; version?: Version }>;
  query: MSearchQuery;
  options?: Options;
}
