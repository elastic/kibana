import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { DashboardState } from '../../common/types';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi, DashboardUser } from './types';
import type { DashboardReadResponseBody } from '../../server';
export declare function getDashboardApi({ creationOptions, incomingEmbeddables, initialState, readResult, savedObjectId, user, isAccessControlEnabled, }: {
    creationOptions?: DashboardCreationOptions;
    incomingEmbeddables: EmbeddablePackageState[] | undefined;
    initialState: DashboardState;
    readResult?: DashboardReadResponseBody;
    savedObjectId?: string;
    user?: DashboardUser;
    isAccessControlEnabled?: boolean;
}): {
    api: DashboardApi;
    internalApi: DashboardInternalApi;
    cleanup: () => void;
};
