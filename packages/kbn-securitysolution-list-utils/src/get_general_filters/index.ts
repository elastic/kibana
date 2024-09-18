/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExceptionListFilter } from '@kbn/securitysolution-io-ts-list-types';
import { isArray } from 'lodash';
import { get } from 'lodash/fp';
import { SavedObjectType } from '../types';

export const getGeneralFilters = (
  filters: ExceptionListFilter,
  namespaceTypes: SavedObjectType[]
): string => {
  return Object.keys(filters)
    .map((filterKey) => {
      const value = get(filterKey, filters);
      if (isArray(value) || (value != null && value.trim() !== '')) {
        const filtersByNamespace = namespaceTypes
          .map((namespace) => {
            const fieldToSearch =
              filterKey === 'name' ? 'name.text' : filterKey === 'types' ? 'type' : filterKey;
            return isArray(value)
              ? value.map((val) => `${namespace}.attributes.${fieldToSearch}:${val}`).join(' OR ')
              : `${namespace}.attributes.${fieldToSearch}:${value}`;
          })
          .join(' OR ');
        return `(${filtersByNamespace})`;
      } else return null;
    })
    .filter((item) => item != null)
    .join(' AND ');
};
