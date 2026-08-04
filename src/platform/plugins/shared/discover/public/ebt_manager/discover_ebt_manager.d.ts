import type { BehaviorSubject } from 'rxjs';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { DiscoverEBTContextProps } from './types';
import { ScopedDiscoverEBTManager } from './scoped_discover_ebt_manager';
export declare class DiscoverEBTManager {
    private isCustomContextEnabled;
    private customContext$;
    private activeScopedManagerId;
    private reportEvent;
    private reportPerformanceEvent;
    private updateProfilesContextWith;
    initialize({ core, discoverEbtContext$, }: {
        core: CoreSetup;
        discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>;
    }): void;
    onDiscoverAppMounted(): void;
    onDiscoverAppUnmounted(): void;
    getProfilesContext(): string[] | undefined;
    createScopedEBTManager(): ScopedDiscoverEBTManager;
}
