import { type DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
export declare function getDataViewFieldList(dataView: DataView | undefined | null, fieldCounts: Record<string, number> | undefined | null): DataViewField[] | null;
export declare function getEsqlQueryFieldList(esqlQueryColumns?: DatatableColumn[]): DataViewField[];
