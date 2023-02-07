/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This module does not have any external plugin dependency on purpose
 * It will be moved to a package in following iterations
 */

import { i18n } from '@kbn/i18n';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { CellAction } from '../../types';

const ID = 'filterIn';
const ICON = 'plusInCircle';
const FILTER_IN = i18n.translate('cellActions.actions.filterIn', {
  defaultMessage: 'Filter In',
});

export const createFilterInAction = ({
  filterManager,
}: {
  filterManager: FilterManager;
}): CellAction => ({
  id: ID,
  type: ID,
  getIconType: (): string => ICON,
  getDisplayName: () => FILTER_IN,
  getDisplayNameTooltip: () => FILTER_IN,
  isCompatible: async ({ field }) => field.name != null,
  execute: async ({ field }) => {
    addFilterIn(field.name, field.value, filterManager);
  },
});

export const addFilterIn = (
  fieldName: string,
  value: string[] | string | null | undefined,
  filterManager: FilterManager | undefined
) => {
  if (filterManager != null) {
    const filter = createFilterIn(fieldName, value);
    filterManager.addFilters(filter);
  }
};

const createFilterIn = (key: string, value: string[] | string | null | undefined): Filter => {
  const queryValue =
    value != null && value.length > 0 ? (Array.isArray(value) ? value[0] : value) : null;
  if (queryValue == null) {
    return {
      exists: {
        field: key,
      },
      meta: {
        alias: null,
        disabled: false,
        key,
        type: 'exists',
        value: 'exists',
      },
    } as Filter;
  }
  return {
    meta: {
      alias: null,
      disabled: false,
      type: 'phrase',
      key,
      value: queryValue,
      params: {
        query: queryValue,
      },
    },
    query: {
      match: {
        [key]: {
          query: queryValue,
          type: 'phrase',
        },
      },
    },
  };
};
