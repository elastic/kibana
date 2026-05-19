import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
interface Options {
    savedObjectsClient: SavedObjectsClientContract;
    version: string;
    buildNum: number;
    log: Logger;
    handleWriteErrors: boolean;
    type: 'config' | 'config-global';
}
export declare function createOrUpgradeSavedConfig(options: Options): Promise<Record<string, any> | undefined>;
export {};
