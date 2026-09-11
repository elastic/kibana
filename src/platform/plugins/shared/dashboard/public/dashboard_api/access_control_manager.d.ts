import type { BehaviorSubject } from 'rxjs';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardReadResponseBody } from '../../server';
export declare function initializeAccessControlManager(savedObjectResult?: DashboardReadResponseBody, savedObjectId$?: BehaviorSubject<string | undefined>): {
    api: {
        accessControl$: BehaviorSubject<Partial<import("@kbn/core/packages/saved-objects/api-server").SavedObjectAccessControl>>;
        changeAccessMode: (accessMode: SavedObjectAccessControl["accessMode"]) => Promise<void>;
    };
    internalApi: {
        getState: () => {
            access_control: {
                access_mode: "default" | "write_restricted";
            };
        } | undefined;
    };
};
