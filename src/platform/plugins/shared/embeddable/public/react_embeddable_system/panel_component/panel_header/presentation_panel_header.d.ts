import type { ViewMode } from '@kbn/presentation-publishing';
import React from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from '../types';
export type PresentationPanelHeaderProps<ApiType extends DefaultPresentationPanelApi> = {
    api: ApiType;
    headerId: string;
    viewMode?: ViewMode;
    hideTitle?: boolean;
    panelTitle?: string;
    panelDescription?: string;
    setDragHandle: (id: string, ref: HTMLDivElement | null) => void;
} & Pick<PresentationPanelProps, 'showBadges' | 'getActions' | 'showNotifications' | 'titleHighlight'>;
export declare const PresentationPanelHeader: <ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi>({ api, viewMode, headerId, getActions, hideTitle, panelTitle, panelDescription, setDragHandle, showBadges, showNotifications, titleHighlight, }: PresentationPanelHeaderProps<ApiType>) => React.JSX.Element | null;
