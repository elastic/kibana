/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SortOrder, SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server/src/apis';
import { getProperty, type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';

const TOP_LEVEL_FIELDS = ['_id', '_score'];

export function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams
): { sort?: SortCombinations[] } {
  if (!sortField) {
    // if we are performing a PIT search, we must sort by some criteria
    // in order to get the 'sort' property for each of the results.
    // Defaulting to '_shard_doc' tells ES to sort by the natural stored order,
    // giving the best performance
    return pit ? { sort: ['_shard_doc'] } : {};
  }

  const types = Array.isArray(type) ? type : [type];

  if (TOP_LEVEL_FIELDS.includes(sortField)) {
    return {
      sort: [
        {
          [sortField]: {
            order: sortOrder,
          },
        },
      ],
    };
  }

  if (types.length > 1) {
    const rootField = getProperty(mappings, sortField);
    if (!rootField) {
      throw Boom.badRequest(
        `Unable to sort multiple types by field ${sortField}, not a root property`
      );
    }

    return {
      sort: [
        {
          [sortField]: {
            order: sortOrder,
            unmapped_type: rootField.type,
          },
        },
      ],
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
    sort: [
      {
        [key]: {
          order: sortOrder,
          unmapped_type: field.type,
        },
      },
    ],
  };
}
