import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CustomizationCallback, DiscoverCustomizationContext, ExtendedDiscoverStateContainer } from './types';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from '../application/main/state_management/redux';
import type { DiscoverCustomizationId, DiscoverCustomizationService } from './customization_service';
import type { DiscoverServices } from '../build_services';
export declare const DiscoverCustomizationContextProvider: import("react").Provider<DiscoverCustomizationContext>;
export declare const useDiscoverCustomizationContext: () => DiscoverCustomizationContext;
export declare const DiscoverCustomizationProvider: import("react").Provider<DiscoverCustomizationService>;
export declare const useDiscoverCustomization$: <TCustomizationId extends DiscoverCustomizationId>(id: TCustomizationId) => import("rxjs").Observable<Extract<import("./customization_types").SearchBarCustomization, {
    id: TCustomizationId;
}> | Extract<import("./customization_types").UnifiedHistogramCustomization, {
    id: TCustomizationId;
}> | undefined>;
export declare const useDiscoverCustomization: <TCustomizationId extends DiscoverCustomizationId>(id: TCustomizationId) => Extract<import("./customization_types").SearchBarCustomization, {
    id: TCustomizationId;
}> | Extract<import("./customization_types").UnifiedHistogramCustomization, {
    id: TCustomizationId;
}> | undefined;
export interface ConnectedCustomizationService extends DiscoverCustomizationService {
    stateContainer: ExtendedDiscoverStateContainer;
    cleanup: () => Promise<void>;
}
export declare const getExtendedDiscoverStateContainer: ({ internalState, injectCurrentTab, getCurrentTab, runtimeStateManager, stateStorage, services, }: {
    internalState: InternalStateStore;
    injectCurrentTab: TabActionInjector;
    getCurrentTab: () => TabState;
    runtimeStateManager: RuntimeStateManager;
    stateStorage: IKbnUrlStateStorage;
    services: DiscoverServices;
}) => ExtendedDiscoverStateContainer;
export declare const getConnectedCustomizationService: ({ customizationCallbacks, internalState, injectCurrentTab, getCurrentTab, runtimeStateManager, stateStorage, services, }: {
    customizationCallbacks: CustomizationCallback[];
    internalState: InternalStateStore;
    injectCurrentTab: TabActionInjector;
    getCurrentTab: () => TabState;
    runtimeStateManager: RuntimeStateManager;
    stateStorage: IKbnUrlStateStorage;
    services: DiscoverServices;
}) => Promise<ConnectedCustomizationService>;
