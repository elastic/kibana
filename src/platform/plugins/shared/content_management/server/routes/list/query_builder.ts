/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { estypes } from '@elastic/elasticsearch';

/**
 * Sentinel value representing items with no creator.
 * When used in createdBy filter, matches items where `created_by` is not set.
 */
const NULL_USER = 'no-user';

/**
 * Regular expression to validate field names for use in sort operations.
 * Field names must start with a letter and contain only alphanumeric characters and underscores.
 * This prevents script injection when field names are used in runtime mappings.
 */
const VALID_FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Validates that a field name is safe for use in Elasticsearch queries and runtime mappings.
 * Field names must start with a letter and contain only alphanumeric characters and underscores.
 * This prevents script injection vulnerabilities when field names are interpolated into Painless scripts.
 *
 * @param fieldName - The field name to validate.
 * @returns `true` if the field name is valid, `false` otherwise.
 *
 * @example
 * isValidFieldName('title'); // true
 * isValidFieldName('my_field'); // true
 * isValidFieldName('_private'); // false (must start with letter)
 * isValidFieldName('field.nested'); // false (dots not allowed)
 */
export const isValidFieldName = (fieldName: string): boolean => {
  return VALID_FIELD_NAME_REGEX.test(fieldName);
};

/**
 * Kbn config-schema validator for field names used in sort and attribute operations.
 * Enforces the same rules as {@link isValidFieldName}: must start with a letter and
 * contain only alphanumeric characters and underscores.
 *
 * Used in route request validation to ensure user-provided field names are safe
 * before they are used in Elasticsearch queries or runtime mappings.
 *
 * @example
 * // In route validation:
 * schema.object({
 *   sortField: fieldNameSchema,
 * })
 */
export const fieldNameSchema = schema.string({
  minLength: 1,
  maxLength: 100,
  validate: (value) => {
    if (!isValidFieldName(value)) {
      return 'Field name must start with a letter and contain only alphanumeric characters and underscores';
    }
  },
});

/**
 * Builds Elasticsearch runtime mappings for sortable fields.
 *
 * Creates a `sortable_title` runtime field that extracts the title from the type-specific
 * attributes in the document source. Optionally creates an additional runtime field for
 * custom sort fields (e.g., `sortable_myField`).
 *
 * The runtime mappings use Painless scripts to access attributes stored at `source[type]`
 * (not `source[type].attributes`), matching Kibana's saved object document structure.
 *
 * @param sortField - Optional custom field name to create a runtime mapping for.
 *   Root fields (`updatedAt`, `createdAt`, `updatedBy`, `createdBy`, `managed`) and
 *   `title` are handled specially and don't need additional runtime mappings.
 * @returns Elasticsearch runtime field mappings.
 *
 * @example
 * // For sorting by title:
 * buildRuntimeMappings(); // Returns { sortable_title: {...} }
 *
 * @example
 * // For sorting by a custom attribute:
 * buildRuntimeMappings('version'); // Returns { sortable_title: {...}, sortable_version: {...} }
 */
export const buildRuntimeMappings = (sortField?: string): estypes.MappingRuntimeFields => {
  // Known root fields that don't need runtime mappings for sorting.
  const rootFields = ['updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'managed'];

  const mappings: estypes.MappingRuntimeFields = {
    sortable_title: {
      type: 'keyword',
      script: {
        source: `
          String docType = params._source.type;
          if (docType != null &&
              params._source.containsKey(docType) &&
              params._source[docType].containsKey('title')) {
            emit(params._source[docType].title.toLowerCase());
          } else {
            emit('');
          }
        `,
      },
    },
  };

  // Add dynamic runtime mapping for custom attribute sort fields.
  // Uses script params to avoid script injection vulnerabilities.
  if (sortField && !rootFields.includes(sortField) && sortField !== 'title') {
    mappings[`sortable_${sortField}`] = {
      type: 'keyword',
      script: {
        source: `
          String docType = params._source.type;
          String fieldName = params.fieldName;
          if (docType != null &&
              params._source.containsKey(docType) &&
              params._source[docType].containsKey(fieldName)) {
            def val = params._source[docType][fieldName];
            emit(val != null ? val.toString().toLowerCase() : '');
          } else {
            emit('');
          }
        `,
        params: {
          fieldName: sortField,
        },
      },
    };
  }

  return mappings;
};

/**
 * Maps sort field names from the request to the actual ES field paths.
 */
const mapSortField = (field: string): string => {
  // For title, use the runtime mapping.
  if (field === 'title') {
    return 'sortable_title';
  }

  // Map root fields to snake_case.
  const rootFieldMap: Record<string, string> = {
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    updatedBy: 'updated_by',
    createdBy: 'created_by',
    managed: 'managed',
  };

  if (field in rootFieldMap) {
    return rootFieldMap[field];
  }

  // For custom attribute fields, use the dynamic runtime mapping.
  return `sortable_${field}`;
};

/**
 * Builds the Elasticsearch sort configuration for the given field and direction.
 *
 * Maps logical field names from the API to their actual Elasticsearch field paths:
 * - `title` → `sortable_title` (uses runtime mapping)
 * - `updatedAt` → `updated_at` (snake_case root field)
 * - `createdAt` → `created_at`
 * - `updatedBy` → `updated_by`
 * - `createdBy` → `created_by`
 * - `managed` → `managed`
 * - Custom attributes → `sortable_{fieldName}` (uses runtime mapping)
 *
 * @param field - The logical field name to sort by.
 * @param direction - Sort direction: `'asc'` for ascending, `'desc'` for descending.
 * @returns Elasticsearch sort configuration array.
 *
 * @example
 * buildSort('title', 'asc');
 * // Returns: [{ sortable_title: { order: 'asc', unmapped_type: 'keyword' } }]
 *
 * @example
 * buildSort('updatedAt', 'desc');
 * // Returns: [{ updated_at: { order: 'desc', unmapped_type: 'keyword' } }]
 */
export const buildSort = (field: string, direction: 'asc' | 'desc'): estypes.Sort => {
  const mappedField = mapSortField(field);

  return [
    {
      [mappedField]: {
        order: direction,
        unmapped_type: 'keyword',
      },
    },
  ];
};

/**
 * Parameters for building the Elasticsearch search query.
 *
 * @see {@link buildSearchQuery}
 */
export interface BuildSearchQueryParams {
  searchQuery?: string;
  tags?: { include?: string[]; exclude?: string[] };
  favoritesOnly?: boolean;
  favoriteRawIds?: string[];
  createdBy?: string[];
  type: string | string[];
}

/**
 * Builds an Elasticsearch bool query from the provided search parameters.
 *
 * Supports the following filtering capabilities:
 * - **Text search**: Uses `simple_query_string` with wildcard suffix, searching
 *   type-specific `title` (boosted 3x) and `description` fields.
 * - **Tag inclusion**: Requires documents to have nested references to all specified tag IDs.
 * - **Tag exclusion**: Excludes documents with nested references to any specified tag IDs.
 * - **Favorites filtering**: Uses an `ids` query to match space-aware raw document IDs.
 * - **Creator filtering**: Uses a `terms` query on the `created_by` field with resolved UIDs.
 *
 * @param params - Search parameters including query text, tag filters, favorites, creator filter, and type.
 * @returns Elasticsearch query container suitable for use in a search request.
 *
 * @example
 * const query = buildSearchQuery({
 *   searchQuery: 'dashboard',
 *   tags: { include: ['tag-1'], exclude: ['tag-2'] },
 *   type: 'dashboard',
 * });
 */
export const buildSearchQuery = ({
  searchQuery,
  tags,
  favoritesOnly,
  favoriteRawIds,
  createdBy,
  type,
}: BuildSearchQueryParams): estypes.QueryDslQueryContainer => {
  const must: estypes.QueryDslQueryContainer[] = [];
  const filter: estypes.QueryDslQueryContainer[] = [];

  // Text search using simple_query_string.
  if (searchQuery) {
    const types = Array.isArray(type) ? type : [type];
    // Build search fields for each type.
    // Attributes are stored directly at source[type], not source[type].attributes.
    const searchFields = types.flatMap((t) => [`${t}.title^3`, `${t}.description`]);

    must.push({
      simple_query_string: {
        query: `${searchQuery}*`,
        fields: searchFields,
        default_operator: 'and',
      },
    });
  }

  // Tag include filter (has_reference equivalent).
  // Uses OR logic (should + minimum_should_match) to match documents with ANY of the specified tags.
  // This matches Saved Objects `hasReference` behavior when passed an array.
  if (tags?.include && tags.include.length > 0) {
    filter.push({
      bool: {
        should: tags.include.map((tagId) => ({
          nested: {
            path: 'references',
            query: {
              bool: {
                must: [
                  { term: { 'references.type': 'tag' } },
                  { term: { 'references.id': tagId } },
                ],
              },
            },
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  // Tag exclude filter (has_no_reference equivalent).
  if (tags?.exclude && tags.exclude.length > 0) {
    filter.push({
      bool: {
        must_not: tags.exclude.map((tagId) => ({
          nested: {
            path: 'references',
            query: {
              bool: {
                must: [
                  { term: { 'references.type': 'tag' } },
                  { term: { 'references.id': tagId } },
                ],
              },
            },
          },
        })),
      },
    });
  }

  // Favorites filter using terms lookup.
  // Note: We use an `ids` query instead of a terms-lookup against `.kibana` to avoid relying on
  // raw index names and to correctly handle space-aware raw IDs.
  if (favoritesOnly && favoriteRawIds && favoriteRawIds.length > 0) {
    filter.push({
      ids: {
        values: favoriteRawIds,
      },
    });
  }

  // CreatedBy filter - match any of the provided user IDs or items without creator.
  if (createdBy && createdBy.length > 0) {
    const hasNoCreatorFilter = createdBy.includes(NULL_USER);
    const userUids = createdBy.filter((uid) => uid !== NULL_USER);

    if (hasNoCreatorFilter && userUids.length > 0) {
      // Match users OR items without creator (excluding managed items).
      // Managed items don't have creators by design, so they shouldn't match "no creator" filter.
      filter.push({
        bool: {
          should: [
            // Match specific users.
            { terms: { created_by: userUids } },
            // Match items without creator (excluding managed).
            {
              bool: {
                must_not: [{ exists: { field: 'created_by' } }],
                filter: [{ term: { managed: false } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    } else if (hasNoCreatorFilter) {
      // Only no-creator filter - match items without created_by (excluding managed).
      filter.push({
        bool: {
          must_not: [{ exists: { field: 'created_by' } }],
        },
      });
      filter.push({
        term: { managed: false },
      });
    } else {
      // Normal user filter - match any of the provided UIDs.
      filter.push({
        terms: {
          created_by: createdBy,
        },
      });
    }
  }

  return {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };
};
