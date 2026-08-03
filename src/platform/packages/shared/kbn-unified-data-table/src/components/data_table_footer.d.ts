import type { FC, PropsWithChildren } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataGridPaginationMode } from '../..';
export interface UnifiedDataTableFooterProps {
    isLoadingMore?: boolean;
    rowCount: number;
    sampleSize: number;
    pageIndex?: number;
    pageCount: number;
    totalHits?: number;
    onFetchMoreRecords?: () => void;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    paginationMode: DataGridPaginationMode;
    hasScrolledToBottom: boolean;
}
export declare const UnifiedDataTableFooter: FC<PropsWithChildren<UnifiedDataTableFooterProps>>;
