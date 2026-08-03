import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export declare class RecentMetricsStorage {
    private readonly storage;
    private readonly storageKey;
    constructor(basePath: string, storage: IStorageWrapper);
    get(): readonly string[];
    add(metricKey: string): void;
}
