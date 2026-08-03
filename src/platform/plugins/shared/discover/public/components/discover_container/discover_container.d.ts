import type { ScopedHistory } from '@kbn/core/public';
import React from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '../../build_services';
import type { CustomizationCallback } from '../../customizations';
export interface DiscoverContainerInternalProps {
    overrideServices: Partial<DiscoverServices>;
    getDiscoverServices: () => Promise<DiscoverServices>;
    scopedHistory: ScopedHistory;
    customizationCallbacks: CustomizationCallback[];
    stateStorageContainer?: IKbnUrlStateStorage;
    isLoading?: boolean;
}
export declare const DiscoverContainerInternal: ({ overrideServices, scopedHistory, customizationCallbacks, getDiscoverServices, stateStorageContainer, isLoading, }: DiscoverContainerInternalProps) => React.JSX.Element;
export default DiscoverContainerInternal;
