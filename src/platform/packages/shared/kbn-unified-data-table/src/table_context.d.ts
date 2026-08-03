import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ValueToStringConverter } from './types';
import type { UseSelectedDocsState } from './hooks/use_selected_docs';
export interface DataTableContext {
    expanded?: DataTableRecord | undefined;
    setExpanded?: (hit?: DataTableRecord) => void;
    getRowByIndex: (index: number) => DataTableRecord | undefined;
    onFilter?: DocViewFilterFn;
    dataView: DataView;
    selectedDocsState: UseSelectedDocsState;
    valueToStringConverter: ValueToStringConverter;
    componentsTourSteps?: Record<string, string>;
    isPlainRecord?: boolean;
    pageIndex: number | undefined;
    pageSize: number | undefined;
}
export declare const UnifiedDataTableContext: React.Context<DataTableContext>;
