/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import { EuiButtonIcon, EuiListGroup, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/discover-utils';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import type { ToastsStart } from '@kbn/core/public';
import {
  SOURCE_COLUMN,
  buildCopyColumnNameButton,
  buildCopyColumnValuesButton,
  buildEditFieldButton,
  getColumnDisplayName,
  getSchemaByKbnType,
  isSortable,
  type SortOrder,
  type UnifiedDataTableSettings,
  type ValueToStringConverter,
} from '@kbn/unified-data-table';

export interface BuildTanStackColumnHeaderActionsParams {
  columnId: string;
  columnIndex: number;
  visibleColumnIds: string[];
  dataView: DataView;
  columnsMeta?: DataTableColumnsMeta;
  settings?: UnifiedDataTableSettings;
  columnSizing: Record<string, number>;
  isSummaryMode: boolean;
  isSortEnabled: boolean;
  isPlainRecord?: boolean;
  sort: SortOrder[];
  onSort?: (sort: SortOrder[]) => void;
  persistVisibleColumns: (columns: string[]) => void;
  onResize?: (options: { columnId: string; width: number | undefined }) => void;
  timeFieldName?: string;
  toastNotifications: ToastsStart;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
  editField?: (fieldName: string) => void;
  hasEditDataViewPermission: () => boolean;
  onActionComplete: () => void;
}

const wrapAction = (
  action: EuiListGroupItemProps,
  onActionComplete: () => void
): EuiListGroupItemProps => ({
  ...action,
  onClick: (event) => {
    event?.stopPropagation?.();
    onActionComplete();
    action.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
  },
});

const buildSortActions = ({
  columnId,
  sort,
  onSort,
  columnIsSortable,
  onActionComplete,
}: {
  columnId: string;
  sort: SortOrder[];
  onSort?: (sort: SortOrder[]) => void;
  columnIsSortable: boolean;
  onActionComplete: () => void;
}): EuiListGroupItemProps[] => {
  if (!onSort || !columnIsSortable) {
    return [];
  }

  const sortingIdx = sort.findIndex(([id]) => id === columnId);
  const currentDirection = sortingIdx >= 0 ? sort[sortingIdx][1] : undefined;

  const sortBy = (direction: 'asc' | 'desc') => {
    if (sortingIdx >= 0 && currentDirection === direction) {
      onSort(sort.filter((_, index) => index !== sortingIdx));
      return;
    }

    if (sortingIdx >= 0) {
      const nextSort = [...sort];
      nextSort[sortingIdx] = [columnId, direction];
      onSort(nextSort);
      return;
    }

    onSort([...sort, [columnId, direction]]);
  };

  const ascLabel =
    currentDirection === 'asc'
      ? i18n.translate('discover.grid.tanStack.unsortAscendingButtonLabel', {
          defaultMessage: 'Unsort ascending',
        })
      : i18n.translate('discover.grid.tanStack.sortAscendingButtonLabel', {
          defaultMessage: 'Sort ascending',
        });

  const descLabel =
    currentDirection === 'desc'
      ? i18n.translate('discover.grid.tanStack.unsortDescendingButtonLabel', {
          defaultMessage: 'Unsort descending',
        })
      : i18n.translate('discover.grid.tanStack.sortDescendingButtonLabel', {
          defaultMessage: 'Sort descending',
        });

  return [
    wrapAction(
      {
        label: ascLabel,
        iconType: 'sortUp',
        iconProps: { size: 'm' },
        onClick: () => sortBy('asc'),
        'data-test-subj': 'gridSortAscendingButton',
      },
      onActionComplete
    ),
    wrapAction(
      {
        label: descLabel,
        iconType: 'sortDown',
        iconProps: { size: 'm' },
        onClick: () => sortBy('desc'),
        'data-test-subj': 'gridSortDescendingButton',
      },
      onActionComplete
    ),
  ];
};

export const buildTanStackColumnHeaderActions = ({
  columnId,
  columnIndex,
  visibleColumnIds,
  dataView,
  columnsMeta,
  settings,
  columnSizing,
  isSummaryMode,
  isSortEnabled,
  isPlainRecord,
  sort,
  onSort,
  persistVisibleColumns,
  onResize,
  timeFieldName,
  toastNotifications,
  valueToStringConverter,
  rowsCount,
  editField,
  hasEditDataViewPermission,
  onActionComplete,
}: BuildTanStackColumnHeaderActionsParams): EuiListGroupItemProps[] => {
  const dataViewField = getDataViewFieldOrCreateFromColumnMeta({
    dataView,
    fieldName: columnId,
    columnMeta: columnsMeta?.[columnId],
  });
  const columnDisplayName = getColumnDisplayName(
    columnId,
    dataViewField?.displayName,
    settings?.columns?.[columnId]?.display,
    'summary'
  );
  const columnSchema = getSchemaByKbnType(dataViewField?.type);
  const columnIsSortable =
    isSortEnabled &&
    isSortable({
      isPlainRecord,
      columnName: columnId,
      columnSchema,
      dataViewField,
    });
  const columnWidth = columnSizing[columnId] ?? settings?.columns?.[columnId]?.width ?? 0;

  const actions: EuiListGroupItemProps[] = [];

  if (!isSummaryMode && columnId !== timeFieldName) {
    actions.push(
      wrapAction(
        {
          label: i18n.translate('discover.grid.tanStack.removeColumnButtonLabel', {
            defaultMessage: 'Remove column',
          }),
          iconType: 'cross',
          iconProps: { size: 'm' },
          onClick: () => {
            persistVisibleColumns(visibleColumnIds.filter((col) => col !== columnId));
          },
          'data-test-subj': 'unifiedDataTableRemoveColumn',
        },
        onActionComplete
      )
    );
  }

  actions.push(
    ...buildSortActions({
      columnId,
      sort,
      onSort,
      columnIsSortable,
      onActionComplete,
    })
  );

  if (!isSummaryMode) {
    if (columnIndex > 0) {
      actions.push(
        wrapAction(
          {
            label: i18n.translate('discover.grid.tanStack.moveColumnLeftButtonLabel', {
              defaultMessage: 'Move left',
            }),
            iconType: 'sortLeft',
            iconProps: { size: 'm' },
            onClick: () => {
              const nextColumns = [...visibleColumnIds];
              [nextColumns[columnIndex - 1], nextColumns[columnIndex]] = [
                nextColumns[columnIndex],
                nextColumns[columnIndex - 1],
              ];
              persistVisibleColumns(nextColumns);
            },
            'data-test-subj': 'gridMoveColumnLeftButton',
          },
          onActionComplete
        )
      );
    }

    if (columnIndex >= 0 && columnIndex < visibleColumnIds.length - 1) {
      actions.push(
        wrapAction(
          {
            label: i18n.translate('discover.grid.tanStack.moveColumnRightButtonLabel', {
              defaultMessage: 'Move right',
            }),
            iconType: 'sortRight',
            iconProps: { size: 'm' },
            onClick: () => {
              const nextColumns = [...visibleColumnIds];
              [nextColumns[columnIndex], nextColumns[columnIndex + 1]] = [
                nextColumns[columnIndex + 1],
                nextColumns[columnIndex],
              ];
              persistVisibleColumns(nextColumns);
            },
            'data-test-subj': 'gridMoveColumnRightButton',
          },
          onActionComplete
        )
      );
    }
  }

  if (onResize && columnWidth > 0) {
    actions.push(
      wrapAction(
        {
          label: i18n.translate('discover.grid.tanStack.resetColumnWidthButtonLabel', {
            defaultMessage: 'Reset width',
          }),
          iconType: 'refresh',
          iconProps: { size: 'm' },
          onClick: () => onResize({ columnId, width: undefined }),
          'data-test-subj': 'unifiedDataTableResetColumnWidth',
        },
        onActionComplete
      )
    );
  }

  if (columnId !== SOURCE_COLUMN) {
    actions.push(
      wrapAction(
        buildCopyColumnNameButton({
          columnDisplayName,
          toastNotifications,
        }),
        onActionComplete
      )
    );
  }

  actions.push(
    wrapAction(
      buildCopyColumnValuesButton({
        columnId,
        columnDisplayName,
        toastNotifications,
        rowsCount,
        valueToStringConverter,
      }),
      onActionComplete
    )
  );

  const editFieldButton =
    editField &&
    dataViewField &&
    buildEditFieldButton({
      hasEditDataViewPermission,
      dataView,
      field: dataViewField,
      editField,
    });

  if (editFieldButton) {
    actions.push(wrapAction(editFieldButton, onActionComplete));
  }

  return actions;
};

export interface TanStackColumnHeaderActionsProps
  extends Omit<BuildTanStackColumnHeaderActionsParams, 'onActionComplete'> {
  columnDisplayName: string;
  headerActionsCss?: ReturnType<typeof import('@emotion/react').css>;
}

export const TanStackColumnHeaderActions = React.memo(
  ({
    columnId,
    columnDisplayName,
    headerActionsCss,
    ...buildParams
  }: TanStackColumnHeaderActionsProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const closePopover = useCallback(() => setIsOpen(false), []);

    const listItems = buildTanStackColumnHeaderActions({
      ...buildParams,
      columnId,
      onActionComplete: closePopover,
    });

    if (listItems.length === 0) {
      return null;
    }

    const actionsButtonLabel = i18n.translate(
      'discover.grid.tanStack.columnActionsButtonAriaLabel',
      {
        defaultMessage: '{columnName}. Click to view column header actions.',
        values: { columnName: columnDisplayName },
      }
    );

    return (
      <EuiPopover
        aria-label={actionsButtonLabel}
        display="block"
        panelPaddingSize="s"
        offset={7}
        anchorPosition="downRight"
        button={
          <EuiToolTip content={actionsButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="boxesVertical"
              iconSize="s"
              color="text"
              css={headerActionsCss}
              aria-label={actionsButtonLabel}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                setIsOpen((open) => !open);
              }}
              data-test-subj={`dataGridHeaderCellActionButton-${columnId}`}
            />
          </EuiToolTip>
        }
        isOpen={isOpen}
        closePopover={closePopover}
      >
        <EuiListGroup
          listItems={listItems}
          data-test-subj={`dataGridHeaderCellActionGroup-${columnId}`}
        />
      </EuiPopover>
    );
  }
);

TanStackColumnHeaderActions.displayName = 'TanStackColumnHeaderActions';
