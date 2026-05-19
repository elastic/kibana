import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverInternalState } from '../../../state_management/redux';
export declare const getAlertsAppMenuItem: ({ discoverParams, services, tabId, getState, subscribe, showCreateRuleV2, }: {
    discoverParams: AppMenuDiscoverParams;
    services: DiscoverServices;
    tabId: string;
    getState: () => DiscoverInternalState;
    subscribe: (listener: () => void) => () => void;
    showCreateRuleV2?: boolean;
}) => DiscoverAppMenuItemType;
