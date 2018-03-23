import Boom from 'boom';

import { getQueryParams } from './query_params';
import { getSortingParams } from './sorting_params';

export function getSearchDsl(mappings, options = {}) {
  const {
    type,
    search,
    searchFields,
    sortField,
    sortOrder,
    tags,
  } = options;

  if (!type && sortField) {
    throw Boom.notAcceptable('Cannot sort without filtering by type');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  return {
    ...getQueryParams(mappings, type, search, searchFields, tags),
    ...getSortingParams(mappings, type, sortField, sortOrder),
  };
}
