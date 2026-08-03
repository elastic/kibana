import React from 'react';
import { type IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../../../customizations';
import type { InternalStateStore, RuntimeStateManager } from '../../state_management/redux';
import type { DiscoverSearchSessionManager } from '../../state_management/discover_search_session';
export interface SingleTabViewProps {
    customizationContext: DiscoverCustomizationContext;
    customizationCallbacks: CustomizationCallback[];
    urlStateStorage: IKbnUrlStateStorage;
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    searchSessionManager: DiscoverSearchSessionManager;
}
export declare const SingleTabView: ({ customizationContext, customizationCallbacks, urlStateStorage, internalState, runtimeStateManager, searchSessionManager, }: SingleTabViewProps) => React.JSX.Element;
