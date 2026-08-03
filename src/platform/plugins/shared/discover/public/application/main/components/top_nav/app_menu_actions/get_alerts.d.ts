import React from 'react';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem, DiscoverAppMenuRunActionParams } from '@kbn/discover-utils';
import type { CreateRuleOptionsFlyoutLegacyItem, CreateRuleOptionsFlyoutProps } from '@kbn/alerting-v2-plugin/public';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverInternalState, InternalStateDispatch } from '../../../state_management/redux';
export declare const getCreateRuleOptionsFlyoutLegacyItems: (items: DiscoverAppMenuPopoverItem[], runActionParams: DiscoverAppMenuRunActionParams) => CreateRuleOptionsFlyoutLegacyItem[];
export declare const getCreateRuleOptionsAppMenuItem: ({ CreateRuleOptionsFlyout, baseItem, alertsPopoverItems, services, tabId, getState, subscribe, }: {
    CreateRuleOptionsFlyout: React.ComponentType<CreateRuleOptionsFlyoutProps>;
    baseItem: DiscoverAppMenuItemType | undefined;
    alertsPopoverItems: DiscoverAppMenuPopoverItem[];
    services: DiscoverServices;
    tabId: string;
    getState: () => DiscoverInternalState;
    subscribe: (listener: () => void) => () => void;
}) => DiscoverAppMenuItemType;
export declare const getAlertsAppMenuItem: ({ discoverParams, services, tabId, getState, dispatch, }: {
    discoverParams: AppMenuDiscoverParams;
    services: DiscoverServices;
    tabId: string;
    getState: () => DiscoverInternalState;
    dispatch: InternalStateDispatch;
}) => DiscoverAppMenuItemType;
