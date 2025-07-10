/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { FilterManager, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

import { addFilter, isEmptyFilterValue } from './add_filter';
import { FILTER_CELL_ACTION_TYPE } from '../../constants';
import { createCellActionFactory } from '../factory';
import {
  filterOutNullableValues,
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  valueToArray,
} from '../utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '../translations';
import type { DefaultActionsSupportedValue } from '../types';

const ICON = 'plusInCircle';
const FILTER_IN = i18n.translate('cellActions.actions.filterIn', {
  defaultMessage: 'Filter for',
});

export const createFilterInActionFactory = createCellActionFactory(
  ({
    filterManager,
    notifications: { toasts },
  }: {
    filterManager: FilterManager;
    notifications: NotificationsStart;
  }) => ({
    type: FILTER_CELL_ACTION_TYPE,
    getIconType: () => ICON,
    getDisplayName: () => FILTER_IN,
    getDisplayNameTooltip: () => FILTER_IN,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        !!field.name &&
        isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
      );
    },
    execute: async ({ data, metadata }) => {
      const field = data[0]?.field;
      const rawValue = data[0]?.value;
      const dataViewId = typeof metadata?.dataViewId === 'string' ? metadata.dataViewId : undefined;

      const value = filterOutNullableValues(valueToArray(rawValue));

      if (isValueSupportedByDefaultActions(value)) {
        addFilterIn({ filterManager, fieldName: field.name, value, dataViewId });
      } else {
        toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
      }
    },
  })
);

export const addFilterIn = ({
  filterManager,
  fieldName,
  value,
  dataViewId,
}: {
  filterManager: FilterManager | undefined;
  fieldName: string;
  value: DefaultActionsSupportedValue;
  dataViewId?: string;
}) => {
  if (filterManager != null) {
    addFilter({
      filterManager,
      key: fieldName,
      value,
      negate: isEmptyFilterValue(value),
      dataViewId,
    });
  }
};
