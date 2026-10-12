/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useImperativeHandle, useState } from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import { EuiHorizontalRule, EuiListGroup, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataSource } from '@kbn/data-source';
import { getDataViewFieldFromDataSource } from '@kbn/discover-utils';
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
  dataSource?: DataSource;
  settings?: UnifiedDataTableSettings;
  columnSizing: Record<string, number>;
  isSummaryMode: boolean;
  isSortEnabled: boolean;
  sort: SortOrder[];
  onSort?: (sort: SortOrder[]) => void;
  persistVisibleColumns: (columns: string[]) => void;
  onResize?: (options: { columnId: string; width: number | undefined }) => void;
  onAutoFitColumn?: (columnId: string) => void;
  onTogglePinColumn?: (columnId: string) => void;
  isColumnPinned?: boolean;
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

// Same schema-based sort labels as EuiDataGrid, so the column menu reads the same in both grids.
const getSortLabels = (columnSchema: string): { asc: string; desc: string } => {
  switch (columnSchema) {
    case 'datetime':
      return {
        asc: i18n.translate('discover.grid.tanStack.sortOldNewButtonLabel', {
          defaultMessage: 'Sort Old-New',
        }),
        desc: i18n.translate('discover.grid.tanStack.sortNewOldButtonLabel', {
          defaultMessage: 'Sort New-Old',
        }),
      };
    case 'numeric':
      return {
        asc: i18n.translate('discover.grid.tanStack.sortLowHighButtonLabel', {
          defaultMessage: 'Sort Low-High',
        }),
        desc: i18n.translate('discover.grid.tanStack.sortHighLowButtonLabel', {
          defaultMessage: 'Sort High-Low',
        }),
      };
    case 'boolean':
      return {
        asc: i18n.translate('discover.grid.tanStack.sortFalseTrueButtonLabel', {
          defaultMessage: 'Sort False-True',
        }),
        desc: i18n.translate('discover.grid.tanStack.sortTrueFalseButtonLabel', {
          defaultMessage: 'Sort True-False',
        }),
      };
    default:
      return {
        asc: i18n.translate('discover.grid.tanStack.sortAscendingButtonLabel', {
          defaultMessage: 'Sort A-Z',
        }),
        desc: i18n.translate('discover.grid.tanStack.sortDescendingButtonLabel', {
          defaultMessage: 'Sort Z-A',
        }),
      };
  }
};

const buildSortActions = ({
  columnId,
  columnSchema,
  sort,
  onSort,
  columnIsSortable,
  onActionComplete,
}: {
  columnId: string;
  columnSchema: string;
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

  const sortLabels = getSortLabels(columnSchema);
  const ascLabel =
    currentDirection === 'asc'
      ? i18n.translate('discover.grid.tanStack.unsortAscendingButtonLabel', {
          defaultMessage: 'Unsort ascending',
        })
      : sortLabels.asc;

  const descLabel =
    currentDirection === 'desc'
      ? i18n.translate('discover.grid.tanStack.unsortDescendingButtonLabel', {
          defaultMessage: 'Unsort descending',
        })
      : sortLabels.desc;

  return [
    wrapAction(
      {
        label: ascLabel,
        iconType: 'sortAscending',
        iconProps: { size: 'm' },
        onClick: () => sortBy('asc'),
        'data-test-subj': 'gridSortAscendingButton',
      },
      onActionComplete
    ),
    wrapAction(
      {
        label: descLabel,
        iconType: 'sortDescending',
        iconProps: { size: 'm' },
        onClick: () => sortBy('desc'),
        'data-test-subj': 'gridSortDescendingButton',
      },
      onActionComplete
    ),
  ];
};

const pushGroup = (groups: EuiListGroupItemProps[][], group: EuiListGroupItemProps[]) => {
  if (group.length > 0) {
    groups.push(group);
  }
};

export const buildTanStackColumnHeaderActionGroups = ({
  columnId,
  columnIndex,
  visibleColumnIds,
  dataView,
  dataSource,
  settings,
  columnSizing,
  isSummaryMode,
  isSortEnabled,
  sort,
  onSort,
  persistVisibleColumns,
  onResize,
  onAutoFitColumn,
  onTogglePinColumn,
  isColumnPinned = false,
  timeFieldName,
  toastNotifications,
  valueToStringConverter,
  rowsCount,
  editField,
  hasEditDataViewPermission,
  onActionComplete,
}: BuildTanStackColumnHeaderActionsParams): EuiListGroupItemProps[][] => {
  const dataViewField = getDataViewFieldFromDataSource({
    dataView,
    dataSource,
    fieldName: columnId,
  });
  const columnDisplayName = getColumnDisplayName(
    columnId,
    dataViewField?.displayName,
    settings?.columns?.[columnId]?.display,
    'table'
  );
  const columnSchema = getSchemaByKbnType(dataViewField?.type);
  const columnIsSortable =
    isSortEnabled &&
    isSortable({
      dataSource,
      columnName: columnId,
      columnSchema,
      dataViewField,
    });
  const columnWidth = columnSizing[columnId] ?? settings?.columns?.[columnId]?.width ?? 0;

  const groups: EuiListGroupItemProps[][] = [];
  const copyGroup: EuiListGroupItemProps[] = [];

  if (columnId !== SOURCE_COLUMN) {
    copyGroup.push(
      wrapAction(
        {
          ...buildCopyColumnNameButton({
            columnDisplayName,
            toastNotifications,
          }),
          label: i18n.translate('discover.grid.tanStack.copyFieldNameButtonLabel', {
            defaultMessage: 'Copy field name',
          }),
        },
        onActionComplete
      )
    );
  }

  copyGroup.push(
    wrapAction(
      {
        ...buildCopyColumnValuesButton({
          columnId,
          columnDisplayName,
          toastNotifications,
          rowsCount,
          valueToStringConverter,
        }),
        label: i18n.translate('discover.grid.tanStack.copyAllValuesButtonLabel', {
          defaultMessage: 'Copy all values',
        }),
      },
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
    copyGroup.push(wrapAction(editFieldButton, onActionComplete));
  }

  pushGroup(groups, copyGroup);

  pushGroup(
    groups,
    buildSortActions({
      columnId,
      columnSchema,
      sort,
      onSort,
      columnIsSortable,
      onActionComplete,
    })
  );

  const layoutGroup: EuiListGroupItemProps[] = [];

  if (onTogglePinColumn) {
    layoutGroup.push(
      wrapAction(
        {
          label: isColumnPinned
            ? i18n.translate('discover.grid.tanStack.unpinColumnButtonLabel', {
                defaultMessage: 'Unpin column',
              })
            : i18n.translate('discover.grid.tanStack.pinColumnButtonLabel', {
                defaultMessage: 'Pin column',
              }),
          iconType: isColumnPinned ? 'pinFill' : 'pin',
          iconProps: { size: 'm' },
          onClick: () => onTogglePinColumn(columnId),
          'data-test-subj': isColumnPinned
            ? 'unifiedDataTableUnpinColumn'
            : 'unifiedDataTablePinColumn',
        },
        onActionComplete
      )
    );
  }

  if (onAutoFitColumn) {
    layoutGroup.push(
      wrapAction(
        {
          label: i18n.translate('discover.grid.tanStack.fitColumnToDataButtonLabel', {
            defaultMessage: 'Fit width to data',
          }),
          iconType: 'distributeHorizontal',
          iconProps: { size: 'm' },
          onClick: () => onAutoFitColumn(columnId),
          'data-test-subj': 'unifiedDataTableFitToData',
        },
        onActionComplete
      )
    );
  }

  if (onResize && columnWidth > 0) {
    layoutGroup.push(
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

  if (!isSummaryMode) {
    if (columnIndex > 0) {
      layoutGroup.push(
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
      layoutGroup.push(
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

  pushGroup(groups, layoutGroup);

  const removeGroup: EuiListGroupItemProps[] = [];

  if (!isSummaryMode && columnId !== timeFieldName) {
    removeGroup.push(
      wrapAction(
        {
          label: i18n.translate('discover.grid.tanStack.removeColumnButtonLabel', {
            defaultMessage: 'Remove column',
          }),
          iconType: 'trash',
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

  pushGroup(groups, removeGroup);

  return groups;
};

export interface TanStackColumnHeaderActionsHandle {
  toggle: () => void;
}

export interface TanStackColumnHeaderActionsProps
  extends Omit<BuildTanStackColumnHeaderActionsParams, 'onActionComplete'> {
  columnDisplayName: string;
  headerCellPopoverAnchorCss?: ReturnType<typeof import('@emotion/react').css>;
}

export const TanStackColumnHeaderActions = React.memo(
  React.forwardRef<TanStackColumnHeaderActionsHandle, TanStackColumnHeaderActionsProps>(
    function TanStackColumnHeaderActions(
      { columnId, columnDisplayName, headerCellPopoverAnchorCss, ...buildParams },
      ref
    ) {
      const [isOpen, setIsOpen] = useState(false);
      const closePopover = useCallback(() => setIsOpen(false), []);
      const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

      useImperativeHandle(ref, () => ({ toggle: togglePopover }), [togglePopover]);

      const actionGroups = isOpen
        ? buildTanStackColumnHeaderActionGroups({
            ...buildParams,
            columnId,
            onActionComplete: closePopover,
          })
        : [];

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
          css={headerCellPopoverAnchorCss}
          display="block"
          panelPaddingSize="s"
          offset={7}
          anchorPosition="downLeft"
          button={<span aria-hidden />}
          isOpen={isOpen}
          closePopover={closePopover}
        >
          <div data-test-subj={`dataGridHeaderCellActionGroup-${columnId}`}>
            {actionGroups.map((groupItems, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {groupIndex > 0 && <EuiHorizontalRule margin="xs" size="full" />}
                <EuiListGroup
                  listItems={groupItems}
                  data-test-subj={`dataGridHeaderCellActionGroup-${columnId}-${groupIndex}`}
                />
              </React.Fragment>
            ))}
          </div>
        </EuiPopover>
      );
    }
  )
);

TanStackColumnHeaderActions.displayName = 'TanStackColumnHeaderActions';
