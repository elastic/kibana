import type { Logger, SavedObjectsServiceStart } from '@kbn/core/server';
export interface SampleDataUsageTracker {
    addInstall(dataSet: string): void;
    addUninstall(dataSet: string): void;
}
export declare function usage(savedObjects: Promise<SavedObjectsServiceStart>, logger: Logger): SampleDataUsageTracker;
