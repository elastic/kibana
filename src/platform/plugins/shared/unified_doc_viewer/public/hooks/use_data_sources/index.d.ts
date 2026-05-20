import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
export interface DataSources {
    indexes: ObservabilityIndexes;
    profileId: string;
}
export declare const DataSourcesProvider: import("react").FC<import("react").PropsWithChildren<DataSources>>, useDataSourcesContext: () => {
    indexes: ObservabilityIndexes;
    profileId: string;
};
