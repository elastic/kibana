/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FieldRecordLegacy } from '@kbn/unified-doc-viewer/types';

export interface TableRow {
  action: Omit<FieldRecordLegacy['action'], 'isActive'>;
  field: {
    pinned: boolean;
    onTogglePinned: (field: string) => void;
  } & FieldRecordLegacy['field'];
  value: FieldRecordLegacy['value'];
}

interface TableActionsProps {
  Component: EuiDataGridColumnCellActionProps['Component'];
  row: TableRow;
}

export const FilterIn: React.FC<TableActionsProps> = ({ Component, row }) => {
  const {
    action: { onFilter, flattenedField },
    field: { field, fieldMapping },
    value: { ignored },
  } = row;
  // Filters pair
  const filtersPairDisabled = Boolean(!fieldMapping || !fieldMapping.filterable || ignored);
  const filterAddLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForValueButtonTooltip',
    {
      defaultMessage: 'Filter for value',
    }
  );

  // const filtersPairToolTip =
  //   (filtersPairDisabled &&
  //     i18n.translate('unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedTooltip', {
  //       defaultMessage: 'Unindexed fields or ignored values cannot be searched',
  //     })) ||
  //   undefined;

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterForValueButton-${field}`}
      iconType="plusInCircle"
      // toolTipContent={filtersPairToolTip} // TODO: find a replacement
      disabled={filtersPairDisabled}
      title={filterAddLabel}
      onClick={() => onFilter(fieldMapping, flattenedField, '+')}
    >
      {filterAddLabel}
    </Component>
  );
};

export const FilterOut: React.FC<TableActionsProps> = ({ Component, row }) => {
  const {
    action: { onFilter, flattenedField },
    field: { field, fieldMapping },
    value: { ignored },
  } = row;
  // Filters pair
  const filtersPairDisabled = Boolean(!fieldMapping || !fieldMapping.filterable || ignored);

  const filterOutLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterOutValueButtonTooltip',
    {
      defaultMessage: 'Filter out value',
    }
  );
  // const filtersPairToolTip =
  //   (filtersPairDisabled &&
  //     i18n.translate('unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedTooltip', {
  //       defaultMessage: 'Unindexed fields or ignored values cannot be searched',
  //     })) ||
  //   undefined;

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addFilterOutValueButton-${field}`}
      iconType="minusInCircle"
      // toolTipContent={filtersPairToolTip} // TODO: find a replacement
      disabled={filtersPairDisabled}
      title={filterOutLabel}
      onClick={() => onFilter(fieldMapping, flattenedField, '-')}
    >
      {filterOutLabel}
    </Component>
  );
};

export const FilterExist: React.FC<TableActionsProps> = ({ Component, row }) => {
  const {
    action: { onFilter },
    field: { field, fieldMapping },
  } = row;

  // Filter exists
  const filterExistsLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForFieldPresentButtonTooltip',
    { defaultMessage: 'Filter for field present' }
  );
  const filtersExistsDisabled = !fieldMapping || !fieldMapping.filterable;
  // const filtersExistsToolTip =
  //   (filtersExistsDisabled &&
  //     (fieldMapping && fieldMapping.scripted
  //       ? i18n.translate(
  //           'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip',
  //           {
  //             defaultMessage: 'Unable to filter for presence of scripted fields',
  //           }
  //         )
  //       : i18n.translate(
  //           'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfMetaFieldsTooltip',
  //           {
  //             defaultMessage: 'Unable to filter for presence of meta fields',
  //           }
  //         ))) ||
  //   undefined;

  if (!onFilter) {
    return null;
  }

  return (
    <Component
      data-test-subj={`addExistsFilterButton-${field}`}
      iconType="filter"
      // toolTipContent={filtersExistsToolTip} // TODO: find a replacement
      disabled={filtersExistsDisabled}
      title={filterExistsLabel}
      onClick={() => onFilter('_exists_', field, '+')}
    >
      {filterExistsLabel}
    </Component>
  );
};

export const PinToggle: React.FC<TableActionsProps> = ({ Component, row }) => {
  const {
    field: { field, pinned, onTogglePinned },
  } = row;

  // Pinned
  const pinnedLabel = pinned
    ? i18n.translate('unifiedDocViewer.docViews.table.unpinFieldLabel', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('unifiedDocViewer.docViews.table.pinFieldLabel', {
        defaultMessage: 'Pin field',
      });
  const pinnedIconType = pinned ? 'pinFilled' : 'pin';

  return (
    <Component
      data-test-subj={`togglePinFilterButton-${field}`}
      iconType={pinnedIconType}
      title={pinnedLabel}
      onClick={() => onTogglePinned(field)}
    >
      {pinnedLabel}
    </Component>
  );
};

export const ToggleColumn: React.FC<TableActionsProps> = ({ Component, row }) => {
  const {
    action: { onToggleColumn, isAddedAsColumn },
    field: { field },
  } = row;

  const isAdded = isAddedAsColumn(field);

  // Toggle columns
  const toggleColumnsLabel = isAdded
    ? i18n.translate('unifiedDocViewer.docViews.table.removeColumnFromTableButtonTooltip', {
        defaultMessage: 'Remove column from table',
      })
    : i18n.translate('unifiedDocViewer.docViews.table.addColumnToTableButtonTooltip', {
        defaultMessage: 'Add column to table',
      });

  return (
    <Component
      data-test-subj={`toggleColumnButton-${field}`}
      iconType={isAdded ? 'list' : 'listAdd'}
      title={toggleColumnsLabel}
      onClick={() => onToggleColumn?.(field)}
    >
      {toggleColumnsLabel}
    </Component>
  );
};
