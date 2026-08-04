import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
export declare function getTextBasedColumnIconType(columnMeta: {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
} | undefined | null): string | null;
