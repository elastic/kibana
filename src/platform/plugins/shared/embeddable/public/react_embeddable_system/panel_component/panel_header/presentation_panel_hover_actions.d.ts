import React from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from '../types';
export interface PresentationPanelHoverActionsProps {
    api: DefaultPresentationPanelApi;
    index?: number;
    getActions: PresentationPanelProps['getActions'];
    setDragHandle: (id: string, ref: HTMLElement | null) => void;
    actionPredicate?: (actionId: string) => boolean;
    className?: string;
    viewMode?: ViewMode;
    showNotifications?: boolean;
    showBorder?: boolean;
}
export declare const PresentationPanelHoverActions: ({ api, index, getActions, setDragHandle, actionPredicate, className, viewMode, showNotifications, }: PresentationPanelHoverActionsProps) => React.JSX.Element;
