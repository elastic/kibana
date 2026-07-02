import type { DashboardCreationOptions } from '../types';
export declare function loadDashboardApi({ getCreationOptions, onApiCleanup, savedObjectId, }: {
    getCreationOptions?: () => Promise<DashboardCreationOptions>;
    onApiCleanup?: () => void;
    savedObjectId?: string;
}): Promise<{
    api: import("../types").DashboardApi;
    cleanup: () => void;
    internalApi: import("../types").DashboardInternalApi;
    useControlsIntegration: boolean | undefined;
} | undefined>;
