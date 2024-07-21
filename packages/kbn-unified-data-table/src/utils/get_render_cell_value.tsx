/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  EuiDataGridCellValueElementProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, ShouldShowFieldInTableHandler } from '@kbn/discover-utils/types';
import { formatFieldValue } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../table_context';
import type { CustomCellRenderer } from '../types';
import { SourceDocument } from '../components/source_document';
import SourcePopoverContent from '../components/source_popover_content';
import { DataTablePopoverCellValue } from '../components/data_table_cell_value';

export const CELL_CLASS = 'unifiedDataTable__cellValue';

export const getRenderCellValueFn = ({
  dataView,
  rows,
  useNewFieldsApi,
  shouldShowFieldHandler,
  closePopover,
  fieldFormats,
  maxEntries,
  externalCustomRenderers,
  isPlainRecord,
}: {
  dataView: DataView;
  rows: DataTableRecord[] | undefined;
  useNewFieldsApi: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  closePopover: () => void;
  fieldFormats: FieldFormatsStart;
  maxEntries: number;
  externalCustomRenderers?: CustomCellRenderer;
  isPlainRecord?: boolean;
}) => {
  return function UnifiedDataTableRenderCellValue({
    rowIndex,
    columnId,
    isDetails,
    setCellProps,
    colIndex,
    isExpandable,
    isExpanded,
  }: EuiDataGridCellValueElementProps) {
    const row = rows ? rows[rowIndex] : undefined;
    const field = dataView.fields.getByName(columnId);
    const ctx = useContext(UnifiedDataTableContext);

    useEffect(() => {
      if (row?.isAnchor) {
        setCellProps({
          className: 'unifiedDataTable__cell--highlight',
        });
      } else if (ctx.expanded && row && ctx.expanded.id === row.id) {
        setCellProps({
          className: 'unifiedDataTable__cell--expanded',
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [ctx, row, setCellProps]);

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
          />
        </span>
      );
    }

    /**
     * when using the fields api this code is used to show top level objects
     * this is used for legacy stuff like displaying products of our ecommerce dataset
     */
    const useTopLevelObjectColumns = Boolean(
      useNewFieldsApi &&
        !field &&
        row?.raw.fields &&
        !(row.raw.fields as Record<string, unknown[]>)[columnId]
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
