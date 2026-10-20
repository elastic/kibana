/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SortOrder, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type {
  SavedObjectsFindSort,
  SavedObjectsPitParams,
} from '@kbn/core-saved-objects-api-server/src/apis';
import { getProperty, type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';

const TOP_LEVEL_FIELDS = ['_score'];

/** Upper bound for {@link SavedObjectsFindSort} lists passed to `find`. */
export const MAX_FIND_SORT_FIELDS = 10;

/** Builds the Elasticsearch `sort` clause for a saved object find. */
export function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams,
  sort?: SavedObjectsFindSort[]
): { sort?: SortCombinations[] } {
  const entries = resolveSortEntries(sortField, sortOrder, sort);
  if (!entries) {
    // A PIT search must sort by some criteria so each hit has a `sort` value.
    // `_shard_doc` is the natural stored order and is the cheapest option.
    return pit ? { sort: ['_shard_doc'] } : {};
  }

  if (entries.length > MAX_FIND_SORT_FIELDS) {
    throw Boom.badRequest(`Cannot sort by more than ${MAX_FIND_SORT_FIELDS} fields`);
  }

  const seen = new Set<string>();
  const clauses = entries.map((entry) => {
    const field = entry?.field;
    if (typeof field !== 'string' || field.length === 0) {
      throw Boom.badRequest('Each sort entry must include a non-empty field');
    }
    if (seen.has(field)) {
      throw Boom.badRequest(`Duplicate sort field ${field}`);
    }
    seen.add(field);
    return buildSortClause(mappings, type, field, entry.order, pit);
  });

  return { sort: clauses };
}

function resolveSortEntries(
  sortField?: string,
  sortOrder?: SortOrder,
  sort?: SavedObjectsFindSort[]
): SavedObjectsFindSort[] | undefined {
  const hasSortArray = Boolean(sort?.length);
  if (hasSortArray && (sortField || sortOrder)) {
    throw Boom.badRequest('sort cannot be combined with sortField or sortOrder');
  }

  if (hasSortArray) {
    return sort;
  }

  if (sortField) {
    return [{ field: sortField, order: sortOrder }];
  }

  return undefined;
}

function buildSortClause(
  mappings: IndexMapping,
  type: string | string[],
  sortField: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams
): SortCombinations {
  if (sortField === '_id') {
    throw Boom.badRequest(
      'Cannot sort by _id. Elasticsearch disables fielddata on _id by default. Open a point in time and sort by _shard_doc to break ties.'
    );
  }

  if (sortField === '_shard_doc') {
    if (!pit) {
      throw Boom.badRequest(
        'Sorting by _shard_doc requires a point in time. Open one with openPointInTimeForType and pass it as pit.'
      );
    }

    return {
      _shard_doc: {
        order: sortOrder,
      },
    };
  }

  if (TOP_LEVEL_FIELDS.includes(sortField)) {
    return {
      [sortField]: {
        order: sortOrder,
      },
    };
  }

  const types = Array.isArray(type) ? type : [type];

  if (types.length > 1) {
    const rootField = getProperty(mappings, sortField);
    if (!rootField) {
      throw Boom.badRequest(
        `Unable to sort multiple types by field ${sortField}, not a root property`
      );
    }

    return {
      [sortField]: {
        order: sortOrder,
        unmapped_type: rootField.type,
      },
    };
  }

  const [typeField] = types;
  let key = `${typeField}.${sortField}`;
  let field = getProperty(mappings, key);
  if (!field) {
    // type field does not exist, try checking the root properties
    key = sortField;
    field = getProperty(mappings, sortField);
    if (!field) {
      throw Boom.badRequest(`Unknown sort field ${sortField}`);
    }
  }

  return {
    [key]: {
      order: sortOrder,
      unmapped_type: field.type,
    },
  };
}
