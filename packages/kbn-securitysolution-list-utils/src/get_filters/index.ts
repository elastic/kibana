/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListFilter, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { getGeneralFilters } from '../get_general_filters';
import { getSavedObjectTypes } from '../get_saved_object_types';
export interface GetFiltersParams {
  filters: ExceptionListFilter;
  namespaceTypes: NamespaceType[];
  hideLists: readonly string[];
}

export const getFilters = ({ filters, namespaceTypes, hideLists }: GetFiltersParams): string => {
  const namespaces = getSavedObjectTypes({ namespaceType: namespaceTypes });
  const generalFilters = getGeneralFilters(filters, namespaces);
  const hideListsFilters = hideLists.map((listId) => {
    const filtersByNamespace = namespaces.map((namespace) => {
      return `not ${namespace}.attributes.list_id: ${listId}*`;
    });
    return `(${filtersByNamespace.join(' AND ')})`;
  });

  return [generalFilters, ...hideListsFilters]
    .filter((filter) => filter.trim() !== '')
    .join(' AND ');
};
