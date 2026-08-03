import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
export interface MainRouteProps {
    customizationContext: DiscoverCustomizationContext;
    customizationCallbacks?: CustomizationCallback[];
    stateStorageContainer?: IKbnUrlStateStorage;
    onAppLeave?: AppMountParameters['onAppLeave'];
}
export declare const DiscoverMainRoute: ({ customizationContext, customizationCallbacks, stateStorageContainer, onAppLeave, }: MainRouteProps) => React.JSX.Element;
