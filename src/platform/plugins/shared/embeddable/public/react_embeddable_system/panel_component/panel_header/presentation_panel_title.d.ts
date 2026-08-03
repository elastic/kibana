import React from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';
export declare const PresentationPanelTitle: ({ api, headerId, viewMode, hideTitle, panelTitle, panelDescription, titleHighlight, }: {
    api: unknown;
    headerId: string;
    hideTitle?: boolean;
    panelTitle?: string;
    panelDescription?: string;
    viewMode?: ViewMode;
    titleHighlight?: string;
}) => React.JSX.Element | null;
