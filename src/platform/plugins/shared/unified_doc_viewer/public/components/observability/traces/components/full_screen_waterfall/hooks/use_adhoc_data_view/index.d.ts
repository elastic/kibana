import type { DataView } from '@kbn/data-views-plugin/common';
export declare const useAdhocDataView: ({ index }: {
    index: string | null;
}) => {
    dataView: DataView | null;
    error: string | null;
    loading: boolean;
};
