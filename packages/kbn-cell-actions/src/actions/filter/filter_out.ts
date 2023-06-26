/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilter, isEmptyFilterValue } from './create_filter';
import { FILTER_CELL_ACTION_TYPE } from '../../constants';
import { createCellActionFactory } from '../factory';
import { CellActionFieldValue } from '../../types';

const ICON = 'minusInCircle';
const FILTER_OUT = i18n.translate('cellActions.actions.filterOut', {
  defaultMessage: 'Filter Out',
});

export const createFilterOutActionFactory = createCellActionFactory(
  ({ filterManager }: { filterManager: FilterManager }) => ({
    type: FILTER_CELL_ACTION_TYPE,
    getIconType: () => ICON,
    getDisplayName: () => FILTER_OUT,
    getDisplayNameTooltip: () => FILTER_OUT,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        !!field.name
      );
    },
    execute: async ({ data }) => {
      const field = data[0]?.field;
      const value = data[0]?.value;

      addFilterOut({
        filterManager,
        fieldName: field.name,
        value,
      });
    },
  })
);

export const addFilterOut = ({
  filterManager,
  fieldName,
  value,
}: {
  filterManager: FilterManager | undefined;
  fieldName: string;
  value: CellActionFieldValue;
}) => {
  if (filterManager != null) {
    const filter = createFilter({
      key: fieldName,
      value,
      negate: !isEmptyFilterValue(value),
    });
    filterManager.addFilters(filter);
  }
};
