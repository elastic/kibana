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

export interface MSearchOut<T = unknown> {
  contentTypes: Array<{ contentTypeId: string; version?: Version }>;
  result: MSearchResult<T>;
}
