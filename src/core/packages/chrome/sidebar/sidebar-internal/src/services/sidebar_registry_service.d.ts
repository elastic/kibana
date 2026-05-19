import type { Observable } from 'rxjs';
import type { SidebarAppConfig, SidebarAppDefinition, SidebarAppId, SidebarAppUpdater, SidebarAppStatus } from '@kbn/core-chrome-sidebar';
export declare class SidebarRegistryService {
    private readonly registeredApps;
    private readonly changed$;
    registerApp<TState = undefined, TActions = undefined>(app: SidebarAppConfig<TState, TActions>): SidebarAppUpdater;
    getApp(appId: SidebarAppId): SidebarAppDefinition;
    hasApp(appId: SidebarAppId): boolean;
    private setStatus;
    getStatus$(appId: SidebarAppId): Observable<SidebarAppStatus>;
    isOpenable(appId: SidebarAppId): boolean;
    isRestorable(appId: SidebarAppId): boolean;
}
