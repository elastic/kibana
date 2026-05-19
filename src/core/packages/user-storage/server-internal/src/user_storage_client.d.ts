import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UserStorageDefinition, IUserStorageClient } from '@kbn/core-user-storage-common';
interface UserStorageClientOpts {
    savedObjectsClient: SavedObjectsClientContract;
    profileUid: string;
    definitions: ReadonlyMap<string, UserStorageDefinition>;
    logger: Logger;
}
/** @internal */
export declare class UserStorageClient implements IUserStorageClient {
    private readonly soClient;
    private readonly profileUid;
    private readonly definitions;
    private readonly logger;
    constructor({ savedObjectsClient, profileUid, definitions, logger }: UserStorageClientOpts);
    get<T = unknown>(key: string): Promise<T>;
    getAll(): Promise<Record<string, unknown>>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    private assertRegistered;
    private getSoType;
}
export {};
