import type { DataTableRecord } from '@kbn/discover-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { RefObject } from 'react';
import React from 'react';
import type { EuiDataGridCellPopoverElementProps, EuiDataGridRefProps } from '@elastic/eui';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
export type OnCellValueChange = (docId: string, update: any) => void;
export declare const getValueInputPopover: ({ rows, columns, onValueChange, dataTableRef, telemetryService: telemetry, }: {
    rows: DataTableRecord[];
    columns: DatatableColumn[];
    onValueChange: OnCellValueChange;
    dataTableRef: RefObject<EuiDataGridRefProps>;
    telemetryService: IndexEditorTelemetryService;
}) => ({ rowIndex, colIndex, columnId, cellContentsElement }: EuiDataGridCellPopoverElementProps) => React.JSX.Element;
