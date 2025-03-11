/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useContext, memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDataGridCellValueElementProps,
  useEuiTheme,
} from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import {
  DataTableColumnsMeta,
  DataTableRecord,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/types';
import { formatFieldValue } from '@kbn/discover-utils';
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
    const { euiTheme } = useEuiTheme();
    const { backgroundBasePrimary: anchorColor } = euiTheme.colors;

    useEffect(() => {
      if (row?.isAnchor) {
        setCellProps({
          className: 'unifiedDataTable__cell--highlight',
          css: { backgroundColor: anchorColor },
        });
      } else if (ctx.expanded && row && ctx.expanded.id === row.id) {
        setCellProps({
          className: 'unifiedDataTable__cell--expanded',
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [ctx, row, setCellProps, anchorColor]);

    if (typeof row === 'undefined') {
      return <span className={CELL_CLASS}>-</span>;
    }

    const CustomCellRenderer = externalCustomRenderers?.[columnId];

    if (CustomCellRenderer) {
      return (
        <span className={CELL_CLASS}>
          <CustomCellRenderer
            rowIndex={rowIndex}
            columnId={columnId}
            isDetails={isDetails}
            setCellProps={setCellProps}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            colIndex={colIndex}
            row={row}
            dataView={dataView}
            fieldFormats={fieldFormats}
            closePopover={closePopover}
            isCompressed={isCompressed}
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
      });
    }

    if (field?.type === '_source' || useTopLevelObjectColumns) {
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
        />
      );
    }

    return (
      <span
        className={CELL_CLASS}
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(row.flattened[columnId], row.raw, fieldFormats, dataView, field),
        }}
      />
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
}: {
  row: DataTableRecord;
  field: DataViewField | undefined;
  columnId: string;
  dataView: DataView;
  useTopLevelObjectColumns: boolean;
  fieldFormats: FieldFormatsStart;
  closePopover: () => void;
}) {
  const closeButton = (
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
  );
  if (useTopLevelObjectColumns || field?.type === '_source') {
    return (
      <SourcePopoverContent
        row={row}
        columnId={columnId}
        useTopLevelObjectColumns={useTopLevelObjectColumns}
        closeButton={closeButton}
      />
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      direction="row"
      responsive={false}
      data-test-subj="dataTableExpandCellActionPopover"
    >
      <EuiFlexItem>
        <DataTablePopoverCellValue>
          <span
            // formatFieldValue guarantees sanitized values
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: formatFieldValue(
                row.flattened[columnId],
                row.raw,
                fieldFormats,
                dataView,
                field
              ),
            }}
          />
        </DataTablePopoverCellValue>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
