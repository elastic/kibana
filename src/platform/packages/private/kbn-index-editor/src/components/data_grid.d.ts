import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import React from 'react';
import type { EditLookupIndexContentContext } from '../types';
interface ESQLDataGridProps {
    rows: DataTableRecord[];
    dataView: DataView;
    columns: DatatableColumn[];
    flyoutType?: 'overlay' | 'push';
    initialColumns?: DatatableColumn[];
    initialRowHeight?: number;
    controlColumnIds?: string[];
    totalHits?: number;
    onOpenIndexInDiscover: EditLookupIndexContentContext['onOpenIndexInDiscover'];
}
declare const DataGrid: React.FC<ESQLDataGridProps>;
export default DataGrid;
