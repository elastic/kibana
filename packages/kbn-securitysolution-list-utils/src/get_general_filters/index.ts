/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListFilter } from '@kbn/securitysolution-io-ts-list-types';
import { get } from 'lodash/fp';
import { SavedObjectType } from '../types';

export const getGeneralFilters = (
  filters: ExceptionListFilter,
  namespaceTypes: SavedObjectType[]
): string => {
  return Object.keys(filters)
    .map((filterKey) => {
      const value = get(filterKey, filters);
      if (value != null && value.trim() !== '') {
        const filtersByNamespace = namespaceTypes
          .map((namespace) => {
            const fieldToSearch = filterKey === 'name' ? 'name.text' : filterKey;
            return `${namespace}.attributes.${fieldToSearch}:${value}`;
          })
          .join(' OR ');
        return `(${filtersByNamespace})`;
      } else return null;
    })
    .filter((item) => item != null)
    .join(' AND ');
};
