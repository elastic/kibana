import Boom from 'boom';

import { getProperty } from '../../../../mappings';

export function getSortingParams(mappings, type, sortField, sortOrder) {
  if (!sortField) {
    return {};
  }

  const types = Array.isArray(type) ? type : [type];

  return {
    sort: types.map(type => {
      const key = `${type}.${sortField}`;
      const field = getProperty(mappings, key);
      if (!field) {
        throw Boom.badRequest(`Unknown sort field ${sortField}`);
      }

      return {
        [key]: {
          order: sortOrder,
          unmapped_type: field.type
        }
      };
    })
  };
}
