import type { SidebarSetup, SidebarStart } from '@kbn/core-chrome-sidebar';
import { SidebarRegistryService } from './sidebar_registry_service';
import { SidebarStateService } from './sidebar_state_service';
/** Composite service for sidebar: registry, UI state, and app state */
export declare class SidebarService {
    readonly registry: SidebarRegistryService;
    readonly state: SidebarStateService;
    private readonly storage;
    constructor(params: {
        basePath: string;
    });
    setup(): SidebarSetup;
    start(): SidebarStart;
    stop(): void;
    private getApp;
}
