import type { MutableRefObject } from 'react';
import React from 'react';
import type { EuiDataGridColumnCellActionProps, EuiDataGridRefProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ValueToStringConverter } from '../types';
export declare const FilterInBtn: ({ cellActionProps: { Component, rowIndex, columnId }, field, dataGridRef, }: {
    cellActionProps: EuiDataGridColumnCellActionProps;
    field: DataViewField;
    dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}) => React.JSX.Element;
export declare const FilterOutBtn: ({ cellActionProps: { Component, rowIndex, columnId }, field, dataGridRef, }: {
    cellActionProps: EuiDataGridColumnCellActionProps;
    field: DataViewField;
    dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}) => React.JSX.Element;
export declare function buildCopyValueButton({ Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps, toastNotifications: ToastsStart, valueToStringConverter: ValueToStringConverter): React.JSX.Element;
export declare function buildCellActions(field: DataViewField, toastNotifications: ToastsStart, valueToStringConverter: ValueToStringConverter, onFilter?: DocViewFilterFn, dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>, hideFilteringOnComputedColumns?: boolean): ((cellActionProps: EuiDataGridColumnCellActionProps) => React.JSX.Element)[];
