import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '../types';
export declare function canPrependTimeFieldColumn(columns: string[] | undefined, timeFieldName: string | undefined, columnsMeta: DataTableColumnsMeta | undefined, showTimeCol: boolean, // based on Advanced Settings `doc_table:hideTimeColumn`
isESQLMode: boolean): boolean;
export declare function getVisibleColumns(columns: string[], dataView: DataView, shouldPrependTimeFieldColumn: boolean): string[];
