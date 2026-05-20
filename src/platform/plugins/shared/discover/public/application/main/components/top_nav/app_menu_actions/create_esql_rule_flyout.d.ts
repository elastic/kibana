import React from 'react';
import type { DiscoverInternalState } from '../../../state_management/redux';
import type { DiscoverServices } from '../../../../../build_services';
export declare function CreateESQLRuleFlyout({ services, tabId, getState, subscribe, onClose, }: {
    services: DiscoverServices;
    tabId: string;
    getState: () => DiscoverInternalState;
    subscribe: (listener: () => void) => () => void;
    onClose: () => void;
}): React.JSX.Element | null;
