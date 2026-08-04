import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
export declare const useDataView: ({ index }: {
    index: string | DataViewSpec;
}) => {
    dataView: DataView | undefined;
    error: Error | undefined;
};
