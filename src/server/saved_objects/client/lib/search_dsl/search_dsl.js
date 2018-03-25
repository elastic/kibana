import Boom from 'boom';

import { getQueryParams } from './query_params';
import { getSortingParams } from './sorting_params';

export function getSearchDsl(mappings, options = {}) {
  const {
    type,
    includeTypes,
    search,
    searchFields,
    sortField,
    sortOrder
  } = options;

  if (!type && sortField) {
    // TODO: why is this not allowed?
    // throw Boom.notAcceptable('Cannot sort without filtering by type');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  return {
    ...getQueryParams(mappings, type, includeTypes, search, searchFields),
    ...getSortingParams(mappings, type, sortField, sortOrder),
  };
}
