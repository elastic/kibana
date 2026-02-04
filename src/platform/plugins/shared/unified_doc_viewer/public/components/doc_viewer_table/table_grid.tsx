/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridCellPopoverElementProps,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridStyle,
  RenderCellValue,
  UseEuiTheme,
} from '@elastic/eui';
import { EuiCallOut, EuiDataGrid, EuiSpacer, EuiText, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { usePager } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useMemo, useRef } from 'react';
import { getUnifiedDocViewerServices } from '../../plugin';
import type { FieldRow } from './field_row';
import { getPinColumnControl } from './get_pin_control';
import { TableCell } from './table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from './table_cell_actions';
import type { UseTableFiltersCallbacksReturn } from './table_filters';
import { useRestorableRef } from './table';

function getGridProps(
  gridStyle?: EuiDataGridStyle
): Pick<EuiDataGridProps, 'columnVisibility' | 'rowHeightsOptions' | 'gridStyle'> {
  return {
    columnVisibility: {
      visibleColumns: ['name', 'value'],
      setVisibleColumns: () => null,
    },
    rowHeightsOptions: { defaultHeight: 'auto' },
    gridStyle: {
      border: 'horizontal',
      stripes: true,
      rowHover: 'highlight',
      header: 'underline',
      cellPadding: 'm',
      fontSize: 's',
      ...(gridStyle ?? {}),
    },
  };
}

export interface TableGridProps {
  id: string;
  containerWidth: number;
  rows: FieldRow[];
  isEsqlMode: boolean;
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
  columns?: string[];
  onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
  searchTerm?: string;
  initialPageSize: number;
  onChangePageSize?: (newPageSize: number) => void;
  initialPageIndex?: number;
  onChangePageIndex?: (newPageIndex: number) => void;
  pinnedFields?: string[];
  onTogglePinned?: (field: string) => void;
  hidePinColumn?: boolean;
  customRenderCellValue?: RenderCellValue;
  customRenderCellPopover?: React.JSXElementConstructor<EuiDataGridCellPopoverElementProps>;
  gridStyle?: EuiDataGridStyle;
  hideFilteringOnComputedColumns?: boolean;
}

const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];

export const GRID_COLUMN_FIELD_NAME = 'name';
export const GRID_COLUMN_FIELD_VALUE = 'value';

export function TableGrid({
  id,
  containerWidth,
  rows,
  isEsqlMode,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  onFindSearchTermMatch,
  searchTerm,
  initialPageSize,
  onChangePageSize,
  initialPageIndex = 0,
  onChangePageIndex,
  onTogglePinned,
  hidePinColumn = false,
  customRenderCellValue,
  customRenderCellPopover,
  gridStyle,
  hideFilteringOnComputedColumns,
}: TableGridProps) {
  const styles = useMemoCss(componentStyles);
  const { toasts } = getUnifiedDocViewerServices();

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }
    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [onRemoveColumn, onAddColumn, columns]);

  const fieldCellActions = useMemo(
    () =>
      getFieldCellActions({
        rows,
        isEsqlMode,
        onFilter: filter,
        onToggleColumn,
        columns,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, filter, onToggleColumn, columns, hideFilteringOnComputedColumns]
  );
  const fieldValueCellActions = useMemo(
    () =>
      getFieldValueCellActions({
        rows,
        isEsqlMode,
        toasts,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, toasts, filter, hideFilteringOnComputedColumns]
  );

  const { curPageIndex, pageSize, totalPages, changePageIndex, changePageSize } = usePager({
    initialPageSize,
    initialPageIndex,
    totalItems: rows.length,
  });

  const handleChangePageIndex = useCallback(
    (newPageIndex: number) => {
      onChangePageIndex?.(newPageIndex);
      changePageIndex(newPageIndex);
    },
    [changePageIndex, onChangePageIndex]
  );

  const handleChangePageSize = useCallback(
    (newPageSize: number) => {
      onChangePageSize?.(newPageSize);
      changePageSize(newPageSize);
    },
    [changePageSize, onChangePageSize]
  );

  const showPagination = totalPages !== 0;

  const pagination = useMemo(() => {
    return showPagination
      ? {
          onChangeItemsPerPage: handleChangePageSize,
          onChangePage: handleChangePageIndex,
          pageIndex: curPageIndex,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }
      : undefined;
  }, [showPagination, handleChangePageSize, handleChangePageIndex, curPageIndex, pageSize]);

  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      {
        id: GRID_COLUMN_FIELD_NAME,
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        initialWidth: Math.min(
          Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
          MAX_NAME_COLUMN_WIDTH
        ),
        actions: false,
        visibleCellActions: 3,
        cellActions: fieldCellActions,
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        displayAsText: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        actions: false,
        visibleCellActions: 3,
        cellActions: fieldValueCellActions,
      },
    ],
    [fieldCellActions, fieldValueCellActions, containerWidth]
  );

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId, isDetails }) => {
      return (
        <TableCell
          searchTerm={searchTerm || ''}
          rows={rows}
          rowIndex={rowIndex}
          columnId={columnId}
          isDetails={isDetails}
          isESQLMode={isEsqlMode}
          onFindSearchTermMatch={onFindSearchTermMatch}
        />
      );
    },
    [searchTerm, rows, isEsqlMode, onFindSearchTermMatch]
  );

  const renderCellPopover = useCallback(
    (props: EuiDataGridCellPopoverElementProps) => {
      const { columnId, children, cellActions, rowIndex } = props;
      const row = rows[rowIndex];

      const params = {
        row,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      };

      let warningMessage: string | undefined;
      if (columnId === GRID_COLUMN_FIELD_VALUE) {
        warningMessage = getFilterInOutPairDisabledWarning(params);
      } else if (columnId === GRID_COLUMN_FIELD_NAME) {
        warningMessage = getFilterExistsDisabledWarning(params);
      }

      return (
        <>
          <EuiText size="s">{children}</EuiText>
          {cellActions}
          {Boolean(warningMessage) && (
            <div>
              <EuiSpacer size="xs" />
              <EuiCallOut announceOnMount={false} title={warningMessage} color="warning" size="s" />
            </div>
          )}
        </>
      );
    },
    [rows, filter, hideFilteringOnComputedColumns]
  );

  const leadingControlColumns = useMemo(() => {
    return onTogglePinned && !hidePinColumn ? [getPinColumnControl({ rows, onTogglePinned })] : [];
  }, [onTogglePinned, hidePinColumn, rows]);

  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const scrollTopRef = useRestorableRef('scrollTop', 0);
  const isScrollRestored = useRef(false);
  const virtualizationOptions = useMemo<EuiDataGridProps['virtualizationOptions']>(
    () => ({
      onScroll: ({ scrollTop }) => {
        if (isScrollRestored.current) {
          scrollTopRef.current = scrollTop;
        } else {
          requestAnimationFrame(() => {
            dataGridRef.current?.scrollTo?.({ scrollTop: scrollTopRef.current });
            isScrollRestored.current = true;
          });
        }
      },
    }),
    [scrollTopRef]
  );

  return (
    <EuiDataGrid
      key={`fields-table-${id}`}
      ref={dataGridRef}
      data-test-subj="UnifiedDocViewerTableGrid"
      {...getGridProps(gridStyle)}
      aria-label={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
        defaultMessage: 'Field values',
      })}
      className="kbnDocViewer__fieldsGrid"
      css={styles.fieldsGrid}
      columns={gridColumns}
      toolbarVisibility={false}
      rowCount={rows.length}
      renderCellValue={customRenderCellValue ? customRenderCellValue : renderCellValue}
      renderCellPopover={customRenderCellPopover ? customRenderCellPopover : renderCellPopover}
      pagination={pagination}
      leadingControlColumns={leadingControlColumns}
      virtualizationOptions={virtualizationOptions}
    />
  );
}

const componentStyles = {
  fieldsGrid: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');
    const fieldNameTopPadding = `calc(${euiTheme.size.xs} * 1.5)`;

    return css({
      '&.euiDataGrid--noControls.euiDataGrid--bordersHorizontal .euiDataGridHeader': {
        borderTop: 'none',
      },

      '&.euiDataGrid--headerUnderline .euiDataGridHeader': {
        borderBottom: euiTheme.border.thin,
      },

      '& [data-gridcell-column-id="name"] .euiDataGridRowCell__content': {
        paddingTop: 0,
        paddingBottom: 0,
      },

      '& [data-gridcell-column-id="pin_field"] .euiDataGridRowCell__content': {
        padding: `calc(${euiTheme.size.xs} / 2) 0 0 ${euiTheme.size.xs}`,
      },

      '.kbnDocViewer__fieldName': {
        paddingTop: fieldNameTopPadding,
        paddingLeft: 0,
        lineHeight: euiTheme.font.lineHeightMultiplier,

        '.euiDataGridRowCell__popover &': {
          fontSize,
        },
      },

      '.kbnDocViewer__fieldName_icon': {
        paddingTop: fieldNameTopPadding,
        lineHeight: euiTheme.font.lineHeightMultiplier,
      },

      '.kbnDocViewer__fieldName_multiFieldBadge': {
        margin: `${euiTheme.size.xs} 0`,
        fontWeight: euiTheme.font.weight.regular,
        fontFamily: euiTheme.font.family,
      },

      '.kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 0,
      },

      '& [data-gridcell-column-id="pin_field"]:focus-within': {
        '.kbnDocViewer__fieldsGrid__pinAction': {
          opacity: 1,
        },
      },

      '.euiDataGridRow:hover .kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 1,
      },
    });
  },
};
