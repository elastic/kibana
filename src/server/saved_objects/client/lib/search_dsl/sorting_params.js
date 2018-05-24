import Boom from 'boom';

import { getProperty } from '../../../../mappings';

export function getSortingParams(mappings, type, sortField, sortOrder) {
  if (!sortField) {
    return {};
  }

  if (Array.isArray(type)) {
    const rootField = getProperty(mappings, sortField);
    if (!rootField) {
      throw Boom.badRequest(`Unable to sort multiple types by field ${sortField}, not a root property`);
    }

    return {
      sort: [{
        [sortField]: {
          order: sortOrder,
          unmapped_type: rootField.type
        }
      }]
    };
  }


  const key = `${type}.${sortField}`;
  const field = getProperty(mappings, key);
  if (!field) {
    throw Boom.badRequest(`Unknown sort field ${sortField}`);
  }

  return {
    sort: [{
      [key]: {
        order: sortOrder,
        unmapped_type: field.type
      }
    }]
  };
}
