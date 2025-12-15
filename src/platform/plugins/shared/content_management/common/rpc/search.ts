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
      // NEW: Sorting support
      sort: schema.maybe(
        schema.object({
          field: schema.string(),
          direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
        })
      ),
      // NEW: User/creator filtering
      createdBy: schema.maybe(
        schema.object({
          included: schema.maybe(schema.arrayOf(schema.string())),
          excluded: schema.maybe(schema.arrayOf(schema.string())),
          includeNoCreator: schema.maybe(schema.boolean()),
        })
      ),
      // NEW: Favorites filtering
      favorites: schema.maybe(
        schema.object({
          only: schema.maybe(schema.boolean()),
          ids: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
      // NEW: Facet requests
      facets: schema.maybe(
        schema.object({
          tags: schema.maybe(
            schema.object({
              size: schema.maybe(schema.number()),
              includeMissing: schema.maybe(schema.boolean()),
            })
          ),
          createdBy: schema.maybe(
            schema.object({
              size: schema.maybe(schema.number()),
              includeMissing: schema.maybe(schema.boolean()),
            })
          ),
        })
      ),
    },
    {
      unknowns: 'forbid',
    }
  ),
]);

const facetBucketSchema = schema.object({
  key: schema.string(),
  doc_count: schema.number(),
});

export const searchResultSchema = schema.object({
  hits: schema.arrayOf(schema.any()),
  pagination: schema.object({
    total: schema.number(),
    cursor: schema.maybe(schema.string()),
  }),
  facets: schema.maybe(
    schema.object({
      tags: schema.maybe(schema.arrayOf(facetBucketSchema)),
      createdBy: schema.maybe(schema.arrayOf(facetBucketSchema)),
    })
  ),
});

export const searchSchemas = {
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
} satisfies ProcedureSchemas;

export interface SearchQuery {
  /** The text to search for. */
  text?: string;
  /** List of tags id to include and exclude. */
  tags?: {
    included?: string[];
    excluded?: string[];
  };
  /** The number of results to return. */
  limit?: number;
  /** The cursor for this query. Can be a page number or a cursor. */
  cursor?: string;

  /**
   * Sorting configuration for server-side sorting.
   * When provided, results will be sorted by the specified field.
   */
  sort?: {
    /** Field to sort by (e.g., 'title', 'updatedAt', 'createdAt'). */
    field: string;
    /** Sort direction. */
    direction: 'asc' | 'desc';
  };

  /**
   * User/creator filtering configuration.
   * Filters results by the `createdBy` field of saved objects.
   */
  createdBy?: {
    /** User profile UIDs to include. Items with these creators will be returned. */
    included?: string[];
    /** User profile UIDs to exclude. Items with these creators will be filtered out. */
    excluded?: string[];
    /** Include items with no creator (null/undefined createdBy). */
    includeNoCreator?: boolean;
  };

  /**
   * Favorites filtering configuration.
   * Used to filter results to only favorited items.
   */
  favorites?: {
    /** Only return favorited items for current user. */
    only?: boolean;
    /** Pre-fetched favorite IDs (client-provided optimization). */
    ids?: string[];
  };

  /**
   * Facet requests for aggregation counts.
   * Used to power filter UI with counts for tags and creators.
   */
  facets?: {
    /** Request tag facet counts. */
    tags?: { size?: number; includeMissing?: boolean };
    /** Request creator facet counts. */
    createdBy?: { size?: number; includeMissing?: boolean };
  };
}

export interface SearchIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  query: SearchQuery;
  version?: Version;
  options?: Options;
}

/**
 * Facet bucket representing a single aggregation result.
 */
export interface FacetBucket {
  /** The key (tag ID, user ID, etc.). */
  key: string;
  /** Number of documents matching this key. */
  doc_count: number;
}

/**
 * Facet results from aggregations.
 */
export interface FacetResults {
  /** Tag facet counts. */
  tags?: FacetBucket[];
  /** Creator facet counts. */
  createdBy?: FacetBucket[];
}

export type SearchResult<T = unknown, M = void> = M extends void
  ? {
      hits: T[];
      pagination: {
        total: number;
        /** Page number or cursor. */
        cursor?: string;
      };
      /** Facet results when requested in the query. */
      facets?: FacetResults;
    }
  : {
      hits: T[];
      pagination: {
        total: number;
        /** Page number or cursor. */
        cursor?: string;
      };
      /** Facet results when requested in the query. */
      facets?: FacetResults;
      meta: M;
    };
