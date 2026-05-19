import type { MouseEventHandler } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
export interface UseNavigationProps {
    dataView: DataView;
    rowIndex: string | undefined;
    rowId: string | undefined;
    columns: string[];
    savedSearchId?: string;
    filters?: Filter[];
}
export declare const useNavigationProps: ({ dataView, rowIndex, rowId, columns, savedSearchId, filters, }: UseNavigationProps) => {
    singleDocHref: string;
    contextViewHref: string;
    onOpenSingleDoc: MouseEventHandler;
    onOpenContextView: MouseEventHandler;
};
