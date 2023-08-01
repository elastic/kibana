/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { FilterManager, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { createFilter, isEmptyFilterValue } from './create_filter';
import { FILTER_CELL_ACTION_TYPE } from '../../constants';
import { createCellActionFactory } from '../factory';
import {
  filterOutNullableValues,
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  valueToArray,
} from '../utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '../translations';
import { DefaultActionsSupportedValue } from '../types';

const ICON = 'plusInCircle';
const FILTER_IN = i18n.translate('cellActions.actions.filterIn', {
  defaultMessage: 'Filter In',
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
    execute: async ({ data }) => {
      const field = data[0]?.field;
      const rawValue = data[0]?.value;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (isValueSupportedByDefaultActions(value)) {
        addFilterIn({ filterManager, fieldName: field.name, value });
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
}: {
  filterManager: FilterManager | undefined;
  fieldName: string;
  value: DefaultActionsSupportedValue;
}) => {
  if (filterManager != null) {
    const filter = createFilter({
      key: fieldName,
      value,
      negate: isEmptyFilterValue(value),
    });
    filterManager.addFilters(filter);
  }
};
