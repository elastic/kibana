import Boom from 'boom';

import { getProperty } from '../../../../mappings';

export function getSortingParams(mappings, type, sortField, sortOrder) {
  if (!sortField) {
    return {};
  }

  const key = type ? `${type}.${sortField}` : sortField;

  const field = getProperty(mappings, key);
  if (!field) {
    throw Boom.badRequest(`Unknown sort field ${sortField}`);
  }

  return {
    sort: [
      {
        [key]: {
          order: sortOrder,
          unmapped_type: field.type
        }
      }
    ]
  };
}
