import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { DocumentDiffMode } from '../types';
export interface UseComparisonCellValueProps {
    dataView: DataView;
    comparisonFields: string[];
    fieldColumnId: string;
    selectedDocIds: string[];
    diffMode: DocumentDiffMode | undefined;
    fieldFormats: FieldFormatsStart;
    getDocById: (id: string) => DataTableRecord | undefined;
}
export declare const useComparisonCellValue: ({ dataView, comparisonFields, fieldColumnId, selectedDocIds, diffMode, fieldFormats, getDocById, }: UseComparisonCellValueProps) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
