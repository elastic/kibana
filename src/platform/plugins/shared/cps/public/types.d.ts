import type { ICPSManager, CPSAppAccessResolver } from '@kbn/cps-utils';
export interface CPSPluginSetup {
    cpsEnabled?: boolean;
    /**
     * Register a dynamic access resolver for a specific app during plugin setup.
     * See {@link ICPSManager.registerAppAccess} for details.
     */
    registerAppAccess(appId: string, resolver: CPSAppAccessResolver): void;
}
export interface CPSConfigType {
    cpsEnabled: boolean;
}
export interface CPSPluginStart {
    cpsManager?: ICPSManager;
}
export interface CPSPluginStop {
}
