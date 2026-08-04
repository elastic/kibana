import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { type InternalStateStore, type RuntimeStateManager } from '../redux';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from '../discover_search_session';
interface UseStateManagers {
    customizationContext: DiscoverCustomizationContext;
    services: DiscoverServices;
    urlStateStorage: IKbnUrlStateStorage;
}
interface UseStateManagersReturn {
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    searchSessionManager: DiscoverSearchSessionManager;
}
export declare const useStateManagers: ({ services, urlStateStorage, customizationContext, }: UseStateManagers) => UseStateManagersReturn;
export {};
