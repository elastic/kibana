import Boom from 'boom';

import { getProperty } from '../../../../mappings';

export function getSortingParams(mappings, type, sortField, sortOrder) {
  if (!sortField) {
    return {};
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
