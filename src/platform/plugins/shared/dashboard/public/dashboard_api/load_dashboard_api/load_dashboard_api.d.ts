import type { EuiFlyoutProps } from '@elastic/eui';
import type { DashboardCreationOptions } from '../types';
export declare function loadDashboardApi({ getCreationOptions, onApiCleanup, savedObjectId, panelFlyoutType, }: {
    getCreationOptions?: () => Promise<DashboardCreationOptions>;
    onApiCleanup?: () => void;
    savedObjectId?: string;
    panelFlyoutType?: EuiFlyoutProps['type'];
}): Promise<{
    api: import("../types").DashboardApi;
    cleanup: () => void;
    internalApi: import("../types").DashboardInternalApi;
    useControlsIntegration: boolean | undefined;
} | undefined>;
