import React from 'react';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
interface ESQLDataGridProps {
    core: CoreStart;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    share?: SharePluginStart;
    rows: ESQLRow[];
    dataView: DataView;
    columns: DatatableColumn[];
    query: AggregateQuery;
    flyoutType?: 'overlay' | 'push';
    isTableView?: boolean;
    initialColumns?: DatatableColumn[];
    initialRowHeight?: number;
    controlColumnIds?: string[];
}
declare const DataGrid: React.FC<ESQLDataGridProps>;
export default DataGrid;
