import React from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from '../types';
export declare const usePresentationPanelHeaderActions: <ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi>(showNotifications: boolean, showBadges: boolean, api: ApiType, getActions: PresentationPanelProps["getActions"]) => {
    badgeElements: React.JSX.Element[];
    notificationElements: React.JSX.Element[];
};
