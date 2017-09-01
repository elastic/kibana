import Boom from 'boom';

import { getProperty } from '../../../../mappings';

export function getSortingParams(mappings, type, sortField, sortOrder) {
  if (!sortField) {
    return {};
  }

  // support sorting in "index order" for efficient scrolling
  if (sortField === '_doc') {
    return {
      sort: [
        {
          '_doc': {
            order: sortOrder
          }
        }
      ]
    };
  }

  const field = getProperty(mappings, `${type}.${sortField}`);
  if (!field) {
    throw Boom.badRequest(`Unknown sort field ${sortField}`);
  }

  return {
    sort: [
      {
        [`${type}.${sortField}`]: {
          order: sortOrder,
          unmapped_type: field.type
        }
      }
    ]
  };
}
