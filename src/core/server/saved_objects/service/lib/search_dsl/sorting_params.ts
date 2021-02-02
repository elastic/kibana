/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import { getProperty, IndexMapping } from '../../../mappings';

// TODO: The plan is for ES to automatically add this tiebreaker when
// using PIT. We should remove this logic one that is resolved.
// https://github.com/elastic/elasticsearch/issues/56828
const ES_PROVIDED_TIEBREAKER = { _shard_doc: 'asc' };

const TOP_LEVEL_FIELDS = ['_id', '_score'];

export function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: string,
  pit?: { id: string; keepAlive?: string }
) {
  if (!sortField) {
    return {};
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
        ...(pit ? [ES_PROVIDED_TIEBREAKER] : []),
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
        ...(pit ? [ES_PROVIDED_TIEBREAKER] : []),
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
      ...(pit ? [ES_PROVIDED_TIEBREAKER] : []),
    ],
  };
}
