import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { DocumentDiffMode } from '../types';
import type { DocMap } from '../../../types';
export interface UseComparisonCellValueProps {
    dataView: DataView;
    columnsMeta: DataTableColumnsMeta | undefined;
    comparisonFields: string[];
    fieldColumnId: string;
    selectedDocIds: string[];
    diffMode: DocumentDiffMode | undefined;
    fieldFormats: FieldFormatsStart;
    docMap: DocMap;
}
export declare const useComparisonCellValue: ({ dataView, columnsMeta, comparisonFields, fieldColumnId, selectedDocIds, diffMode, fieldFormats, docMap, }: UseComparisonCellValueProps) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
