import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UserStorageDefinition, IUserStorageClient } from '@kbn/core-user-storage-common';
interface UserStorageClientOpts {
    /**
     * Must be a client obtained via `getScopedClient` (not `createScopedRepository`):
     * only the former applies the spaces extension, so `getCurrentNamespace()` returns
     * the correct space id rather than always `undefined`.
     */
    savedObjectsClient: SavedObjectsClientContract;
    profileUid: string;
    definitions: ReadonlyMap<string, UserStorageDefinition>;
    logger: Logger;
}
/** @internal */
export declare class UserStorageClient implements IUserStorageClient {
    private readonly soClient;
    private readonly profileUid;
    private readonly namespace;
    private readonly definitions;
    private readonly logger;
    constructor({ savedObjectsClient, profileUid, definitions, logger }: UserStorageClientOpts);
    get<T = unknown>(key: string): Promise<T>;
    getForInjection(): Promise<Record<string, unknown>>;
    set<T = unknown>(key: string, value: T): Promise<T>;
    remove(key: string): Promise<void>;
    private assertRegistered;
    private getSoType;
    /**
     * Returns the saved object document id for the given definition.
     *
     * - **Global** (`scope: 'global'`): `profile_uid` — one agnostic doc per user.
     * - **Space** (`scope: 'space'`): `{space}:{profile_uid}` — `user-storage` is
     *   `namespaceType: 'multiple-isolated'`, which means the raw ES `_id` does NOT
     *   include a namespace prefix (unlike `single` types). Without application-level
     *   namespacing the same profile_uid becomes a globally-unique id, causing cross-
     *   space writes to conflict. Embedding the space in the id gives each space its
     *   own document while preserving the access-control capabilities of the
     *   `multiple-isolated` namespace type.
     */
    private getSoId;
    /** Space-scoped document id for this request: `{space}:{profile_uid}`. */
    private spaceDocId;
}
export {};
