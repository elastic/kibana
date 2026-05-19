import type { Observable } from 'rxjs';
import type { SidebarAppId } from '@kbn/core-chrome-sidebar';
import type { SidebarRegistryService } from './sidebar_registry_service';
import type { StorageHelper } from './storage_helper';
export declare class SidebarStateService {
    private readonly registry;
    private readonly storage;
    private readonly currentAppId$;
    private readonly width$;
    constructor(registry: SidebarRegistryService, storage: StorageHelper);
    isOpen$(): Observable<boolean>;
    getWidth$(): Observable<number>;
    getCurrentAppId$(): Observable<SidebarAppId | null>;
    start(): void;
    private handleWindowResize;
    open(appId: SidebarAppId): void;
    close(): void;
    isOpen(): boolean;
    setWidth(width: number): void;
    getWidth(): number;
    getCurrentAppId(): SidebarAppId | null;
    stop(): void;
}
