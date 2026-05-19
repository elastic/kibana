import React from 'react';
import type { ESQLRow } from '@kbn/es-types';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
interface ESQLDataGridProps {
    rows: ESQLRow[];
    dataView: DataView;
    columns: DatatableColumn[];
    query: AggregateQuery;
    /**
     * Optional parameters
     */
    flyoutType?: 'overlay' | 'push';
    isTableView?: boolean;
    initialColumns?: DatatableColumn[];
    fullHeight?: boolean;
    initialRowHeight?: number;
    controlColumnIds?: string[];
}
export declare const ESQLDataGrid: (props: ESQLDataGridProps) => React.JSX.Element;
export {};
