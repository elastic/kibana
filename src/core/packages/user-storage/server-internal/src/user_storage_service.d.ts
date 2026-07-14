import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import type { InternalSecurityServiceStart } from '@kbn/core-security-server-internal';
import type { UserStorageServiceSetup, UserStorageServiceStart } from '@kbn/core-user-storage-server';
export interface UserStorageSetupDeps {
    http: InternalHttpServiceSetup;
    savedObjects: SavedObjectsServiceSetup;
}
export interface UserStorageStartDeps {
    savedObjects: InternalSavedObjectsServiceStart;
    security: InternalSecurityServiceStart;
}
/** @internal */
export declare class UserStorageService {
    private readonly definitions;
    private readonly logger;
    /**
     * Populated in `start()`; routes call this to get a scoped client. Using a
     * mutable reference avoids a hard dependency between the route setup (which
     * runs during `setup()`) and the start-time dependencies (savedObjects,
     * security) that are only available once `start()` fires.
     */
    private scopedClientFactory;
    constructor(coreContext: CoreContext);
    setup({ http, savedObjects }: UserStorageSetupDeps): UserStorageServiceSetup;
    start({ savedObjects, security }: UserStorageStartDeps): UserStorageServiceStart;
    stop(): void;
}
