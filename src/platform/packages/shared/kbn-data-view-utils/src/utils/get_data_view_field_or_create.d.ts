import type { DataView } from '@kbn/data-views-plugin/public';
import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
export declare const getDataViewFieldOrCreateFromColumnMeta: ({ dataView, fieldName, columnMeta, }: {
    dataView: DataView;
    fieldName: string;
    columnMeta?: DatatableColumnMeta;
}) => import("@kbn/data-views-plugin/public").DataViewField | undefined;
