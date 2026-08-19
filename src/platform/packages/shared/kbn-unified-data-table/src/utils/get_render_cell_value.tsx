/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useContext, memo, useRef } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { EuiDataGridCellValueElementProps, EuiDataGridSetCellProps } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import type {
  DataTableColumnsMeta,
  DataTableRecord,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/types';
import { formatFieldValueReact, tryPrettyPrintJsonBlocks } from '@kbn/discover-utils';
import { css } from '@emotion/react';
import { UnifiedDataTableContext } from '../table_context';
import type { CustomCellRenderer } from '../types';
import { SourceDocument } from '../components/source_document';
import SourcePopoverContent from '../components/source_popover_content';
import { DataTablePopoverCellValue } from '../components/data_table_cell_value';

export const CELL_CLASS = 'unifiedDataTable__cellValue';

const IS_JEST_ENVIRONMENT = typeof jest !== 'undefined';

export const getRenderCellValueFn = ({
  dataView,
  rows,
  shouldShowFieldHandler,
  closePopover,
  fieldFormats,
  maxEntries,
  externalCustomRenderers,
  isPlainRecord,
  isCompressed = true,
  columnsMeta,
}: {
  dataView: DataView;
  rows: DataTableRecord[] | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  closePopover: () => void;
  fieldFormats: FieldFormatsStart;
  maxEntries: number;
  externalCustomRenderers?: CustomCellRenderer;
  isPlainRecord?: boolean;
  isCompressed?: boolean;
  columnsMeta: DataTableColumnsMeta | undefined;
}) => {
  const UnifiedDataTableRenderCellValue = ({
    rowIndex,
    columnId,
    isDetails,
    setCellProps,
    colIndex,
    isExpandable,
    isExpanded,
  }: EuiDataGridCellValueElementProps) => {
    const row = rows ? rows[rowIndex] : undefined;
    const field = getDataViewFieldOrCreateFromColumnMeta({
      dataView,
      fieldName: columnId,
      columnMeta: columnsMeta?.[columnId],
    });
    const ctx = useContext(UnifiedDataTableContext);
    const internalCellProps = useRef<EuiDataGridSetCellProps>({});
    const customCellProps = useRef<EuiDataGridSetCellProps>({});
    const CustomCellRenderer = externalCustomRenderers?.[columnId];

    const applyCellProps = useCallback(() => {
      setCellProps({
        ...internalCellProps.current,
        ...customCellProps.current,
        className: classNames(
          internalCellProps.current.className,
          customCellProps.current.className
        ),
        style: {
          ...internalCellProps.current.style,
          ...customCellProps.current.style,
        },
      });
    }, [setCellProps]);

    const setInternalCellProps = useCallback(
      (nextCellProps: EuiDataGridSetCellProps = {}) => {
        internalCellProps.current = nextCellProps;
        applyCellProps();
      },
      [applyCellProps]
    );

    const setCustomCellProps = useCallback(
      (nextCellProps: EuiDataGridSetCellProps = {}) => {
        customCellProps.current = nextCellProps;
        applyCellProps();
      },
      [applyCellProps]
    );

    useEffect(() => {
      if (CustomCellRenderer && row) {
        return () => setCustomCellProps({});
      }

      setCustomCellProps({});
    }, [CustomCellRenderer, columnId, row, setCustomCellProps]);

    useEffect(() => {
      if (row?.isAnchor) {
        setInternalCellProps({ className: 'unifiedDataTable__cell--highlight' });
      } else if (ctx.expanded && row && ctx.expanded.id === row.id) {
        setInternalCellProps({ className: 'unifiedDataTable__cell--expanded' });
      } else {
        setInternalCellProps({});
      }
      // re-apply styles if `columnId` changes, e.g. when reordering columns in the grid
    }, [ctx, row, setInternalCellProps, columnId]);

    if (typeof row === 'undefined') {
      return <span className={CELL_CLASS}>-</span>;
    }

    if (CustomCellRenderer) {
      return (
        <span className={CELL_CLASS}>
          <CustomCellRenderer
            rowIndex={rowIndex}
            columnId={columnId}
            isDetails={isDetails}
            setCellProps={setCustomCellProps}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            colIndex={colIndex}
            row={row}
            dataView={dataView}
            fieldFormats={fieldFormats}
            closePopover={closePopover}
            isCompressed={isCompressed}
            columnsMeta={columnsMeta}
          />
        </span>
      );
    }

    /**
     * when using the fields api this code is used to show top level objects
     * this is used for legacy stuff like displaying products of our ecommerce dataset
     */
    const useTopLevelObjectColumns = Boolean(
      !field && row?.raw.fields && !(row.raw.fields as Record<string, unknown[]>)[columnId]
    );

    if (isDetails) {
      return renderPopoverContent({
        row,
        field,
        columnId,
        dataView,
        useTopLevelObjectColumns,
        fieldFormats,
        closePopover,
        isPlainRecord,
      });
    }

    if (
      field?.type === '_source' ||
      useTopLevelObjectColumns ||
      (isPlainRecord && columnId === '_source')
    ) {
      return (
        <SourceDocument
          useTopLevelObjectColumns={useTopLevelObjectColumns}
          row={row}
          dataView={dataView}
          columnId={columnId}
          fieldFormats={fieldFormats}
          shouldShowFieldHandler={shouldShowFieldHandler}
          maxEntries={maxEntries}
          isPlainRecord={isPlainRecord}
          isCompressed={isCompressed}
          columnsMeta={columnsMeta}
        />
      );
    }

    return (
      <span className={CELL_CLASS}>
        {formatFieldValueReact({
          value: row.flattened[columnId],
          hit: row.raw,
          fieldFormats,
          dataView,
          field,
        })}
      </span>
    );
  };

  // When memoizing renderCellValue, the following warning is logged in Jest tests:
  // Failed prop type: Invalid prop `renderCellValue` supplied to `EuiDataGridCellContent`, expected one of type [function].
  // This is due to incorrect prop type validation that EUI generates for testing components in Jest,
  // but is not an actual issue encountered outside of tests
  return IS_JEST_ENVIRONMENT
    ? UnifiedDataTableRenderCellValue
    : memo(UnifiedDataTableRenderCellValue);
};

/**
 * Helper function for the cell popover
 */
function renderPopoverContent({
  row,
  field,
  columnId,
  dataView,
  useTopLevelObjectColumns,
  fieldFormats,
  closePopover,
  isPlainRecord,
}: {
  row: DataTableRecord;
  field: DataViewField | undefined;
  columnId: string;
  dataView: DataView;
  useTopLevelObjectColumns: boolean;
  fieldFormats: FieldFormatsStart;
  closePopover: () => void;
  isPlainRecord?: boolean;
}) {
  const closeButton = (
    <EuiToolTip
      content={i18n.translate('unifiedDataTable.grid.closePopover', {
        defaultMessage: `Close popover`,
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        aria-label={i18n.translate('unifiedDataTable.grid.closePopover', {
          defaultMessage: `Close popover`,
        })}
        data-test-subj="docTableClosePopover"
        iconSize="s"
        iconType="cross"
        size="xs"
        onClick={closePopover}
      />
    </EuiToolTip>
  );
  if (
    useTopLevelObjectColumns ||
    field?.type === '_source' ||
    (isPlainRecord && columnId === '_source')
  ) {
    return (
      <SourcePopoverContent
        row={row}
        columnId={columnId}
        useTopLevelObjectColumns={useTopLevelObjectColumns}
        closeButton={closeButton}
      />
    );
  }

  const value = row.flattened[columnId];

  const formattedValue =
    field?.type === 'string' && typeof value === 'string'
      ? tryPrettyPrintJsonBlocks(value) ?? value
      : value;

  return (
    <EuiFlexGroup
      gutterSize="none"
      direction="row"
      responsive={false}
      data-test-subj="dataTableExpandCellActionPopover"
    >
      <EuiFlexItem>
        <DataTablePopoverCellValue>
          <div
            data-test-subj="dataTableExpandCellActionPopoverValue"
            css={css`
              white-space: pre-wrap;
              max-height: 350px;
              overflow: auto;
            `}
            tabIndex={0}
          >
            {formatFieldValueReact({
              value: formattedValue,
              hit: row.raw,
              fieldFormats,
              dataView,
              field,
            })}
          </div>
        </DataTablePopoverCellValue>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
