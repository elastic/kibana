import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FileServiceStart } from '../file_service';
interface Args {
    usageCollection?: UsageCollectionSetup;
    getFileService: () => undefined | FileServiceStart;
}
export declare function registerUsageCollector({ usageCollection, getFileService }: Args): void;
export {};
