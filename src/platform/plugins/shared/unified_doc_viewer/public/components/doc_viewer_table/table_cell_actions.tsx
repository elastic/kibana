/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import {
  shouldShowFieldFilterExistAction,
  shouldShowFieldFilterInOutActions,
} from '@kbn/unified-doc-viewer/utils/should_show_field_filter_actions';
import type { IToasts } from '@kbn/core/public';
import type { FieldRow } from './field_row';
import type { TableGridCellActionDefinition } from './table_grid/model';

interface CheckFilterParams {
  row: FieldRow | undefined;
  onFilter: DocViewFilterFn | undefined;
  hideFilteringOnComputedColumns?: boolean;
}

function isFilterDisabledDueToIgnoredReason({ row, onFilter }: CheckFilterParams): boolean {
  if (!row) {
    return false;
  }

  const { ignoredReason } = row;
  return Boolean(onFilter && ignoredReason);
}

function isFilterInOutPairDisabled(params: CheckFilterParams): boolean {
  const { row, onFilter, hideFilteringOnComputedColumns } = params;
  if (!row) {
    return false;
  }

  return (
    !shouldShowFieldFilterInOutActions({
      dataViewField: row.dataViewField,
      onFilter,
      hideFilteringOnComputedColumns,
    }) || isFilterDisabledDueToIgnoredReason(params)
  );
}

export function getFilterInOutPairDisabledWarning(params: CheckFilterParams): string | undefined {
  const { row } = params;
  if (!row || !isFilterInOutPairDisabled(params)) {
    return undefined;
  }

  const { dataViewField } = row;

  if (isFilterDisabledDueToIgnoredReason(params)) {
    return i18n.translate(
      'unifiedDocViewer.docViews.table.ignoredValuesCanNotBeSearchedWarningMessage',
      {
        defaultMessage: 'Ignored values cannot be searched',
      }
    );
  }

  return !dataViewField
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedWarningMessage',
        {
          defaultMessage: 'Unindexed fields cannot be searched',
        }
      )
    : undefined;
}

function isFilterExistsDisabled(params: CheckFilterParams): boolean {
  const { row, onFilter, hideFilteringOnComputedColumns } = params;
  if (!row) {
    return false;
  }

  return !shouldShowFieldFilterExistAction({
    dataViewField: row.dataViewField,
    onFilter,
    hideFilteringOnComputedColumns,
  });
}

export function getFilterExistsDisabledWarning(params: CheckFilterParams): string | undefined {
  const { row } = params;
  if (!row || !isFilterExistsDisabled(params)) {
    return undefined;
  }

  const { dataViewField } = row;

  return dataViewField?.scripted
    ? i18n.translate(
        'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfScriptedFieldsWarningMessage',
        {
          defaultMessage: 'Unable to filter for presence of scripted fields',
        }
      )
    : undefined;
}

const filterExistsLabel = i18n.translate(
  'unifiedDocViewer.docViews.table.filterForFieldPresentButtonTooltip',
  { defaultMessage: 'Filter for field present' }
);

const toggleColumnLabel = i18n.translate(
  'unifiedDocViewer.docViews.table.toggleColumnTableButtonTooltip',
  {
    defaultMessage: 'Toggle column in table',
  }
);

const filterForValueLabel = i18n.translate(
  'unifiedDocViewer.docViews.table.filterForValueButtonTooltip',
  {
    defaultMessage: 'Filter for value',
  }
);

const filterOutValueLabel = i18n.translate(
  'unifiedDocViewer.docViews.table.filterOutValueButtonTooltip',
  {
    defaultMessage: 'Filter out value',
  }
);

const copyValueLabel = i18n.translate('unifiedDocViewer.docViews.table.copyValue', {
  defaultMessage: 'Copy value',
});

export function getFieldCellActions({
  columns,
  hideFilteringOnComputedColumns,
  onFilter,
  onToggleColumn,
}: {
  columns?: string[];
  hideFilteringOnComputedColumns?: boolean;
  onFilter?: DocViewFilterFn;
  onToggleColumn: ((field: string) => void) | undefined;
}): Array<TableGridCellActionDefinition<FieldRow>> {
  const actions: Array<TableGridCellActionDefinition<FieldRow>> = [];

  if (onFilter) {
    actions.push({
      id: 'filter-exists',
      resolve: ({ row }) => {
        const { name } = row;

        if (isFilterExistsDisabled({ row, onFilter, hideFilteringOnComputedColumns })) {
          return undefined;
        }

        return {
          id: 'filter-exists',
          label: filterExistsLabel,
          icon: 'filter',
          dataTestSubj: `addExistsFilterButton-${name}`,
          onExecute: () => onFilter('_exists_', name, '+'),
        };
      },
    });
  }

  if (onToggleColumn) {
    actions.push({
      id: 'toggle-column',
      resolve: ({ row }) => {
        const { name } = row;

        return {
          id: 'toggle-column',
          label: toggleColumnLabel,
          icon: columns?.includes(name) ? 'remove' : 'add',
          dataTestSubj: `toggleColumnButton-${name}`,
          onExecute: () => onToggleColumn(name),
        };
      },
    });
  }

  return actions;
}

export function getFieldValueCellActions({
  hideFilteringOnComputedColumns,
  onFilter,
  toasts,
}: {
  hideFilteringOnComputedColumns?: boolean;
  onFilter?: DocViewFilterFn;
  toasts: IToasts;
}): Array<TableGridCellActionDefinition<FieldRow>> {
  const actions: Array<TableGridCellActionDefinition<FieldRow>> = [];

  if (onFilter) {
    actions.push(
      {
        id: 'filter-for-value',
        resolve: ({ row }) => {
          const { dataViewField, flattenedValue, name } = row;

          if (isFilterInOutPairDisabled({ row, onFilter, hideFilteringOnComputedColumns })) {
            return undefined;
          }

          return {
            id: 'filter-for-value',
            label: filterForValueLabel,
            icon: 'add',
            dataTestSubj: `addFilterForValueButton-${name}`,
            onExecute: () => onFilter(dataViewField, flattenedValue, '+'),
          };
        },
      },
      {
        id: 'filter-out-value',
        resolve: ({ row }) => {
          const { dataViewField, flattenedValue, name } = row;

          if (isFilterInOutPairDisabled({ row, onFilter, hideFilteringOnComputedColumns })) {
            return undefined;
          }

          return {
            id: 'filter-out-value',
            label: filterOutValueLabel,
            icon: 'subtract',
            dataTestSubj: `addFilterOutValueButton-${name}`,
            onExecute: () => onFilter(dataViewField, flattenedValue, '-'),
          };
        },
      }
    );
  }

  actions.push({
    id: 'copy-value',
    resolve: ({ row }) => {
      const { formattedAsText, name } = row;

      return {
        id: 'copy-value',
        label: copyValueLabel,
        icon: 'copy',
        dataTestSubj: `copyValueButton-${name}`,
        onExecute: () => {
          const errorMessage = i18n.translate(
            'unifiedDocViewer.tableCellActions.copyFailedErrorText',
            {
              defaultMessage: 'Unable to copy to clipboard in this browser',
            }
          );

          if (!formattedAsText || !copyToClipboard(formattedAsText)) {
            toasts.addWarning({ title: errorMessage });
            return;
          }

          toasts.addInfo({
            title: i18n.translate(
              'unifiedDocViewer.tableCellActions.copyValueToClipboard.toastTitle',
              {
                defaultMessage: 'Copied to clipboard',
              }
            ),
          });
        },
      };
    },
  });

  return actions;
}
