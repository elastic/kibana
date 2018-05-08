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
    extraFilters,
  } = options;

  if (!type && sortField) {
    throw Boom.notAcceptable('Cannot sort without filtering by type');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  if (extraFilters && !Array.isArray(extraFilters)) {
    throw Boom.notAcceptable('extraFilters must be an array');
  }

  return {
    ...getQueryParams(mappings, type, search, searchFields, extraFilters),
    ...getSortingParams(mappings, type, sortField, sortOrder),
  };
}
