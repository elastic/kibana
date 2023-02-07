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
import type { Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { CellAction } from '../../types';

const ID = 'filterOut';
const ICON = 'minusInCircle';
const FILTER_OUT = i18n.translate('cellActions.actions.filterOut', {
  defaultMessage: 'Filter Out',
});

export const createFilterOutAction = ({
  filterManager,
}: {
  filterManager: FilterManager;
}): CellAction => ({
  id: ID,
  type: ID,
  getIconType: (): string => ICON,
  getDisplayName: () => FILTER_OUT,
  getDisplayNameTooltip: () => FILTER_OUT,
  isCompatible: async ({ field }) => field.name != null,
  execute: async ({ field }) => {
    addFilterOut(field.name, field.value, filterManager);
  },
});

export const addFilterOut = (
  fieldName: string,
  value: string[] | string | null | undefined,
  filterManager: FilterManager | undefined
) => {
  if (filterManager != null) {
    const filter = createFilterOut(fieldName, value);
    filterManager.addFilters(filter);
  }
};

const createFilterOut = (key: string, value: string[] | string | null | undefined): Filter => {
  const negate = value != null && value?.length > 0;
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
        negate,
        type: 'exists',
        value: 'exists',
      },
    } as Filter;
  }
  return {
    meta: {
      alias: null,
      negate,
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
