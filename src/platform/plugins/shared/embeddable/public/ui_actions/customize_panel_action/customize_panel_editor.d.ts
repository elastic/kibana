import React from 'react';
import type { CustomizePanelActionApi } from './customize_panel_action';
export declare const CustomizePanelEditor: ({ api, onClose, focusOnTitle, ariaLabelledBy, }: {
    onClose: () => void;
    focusOnTitle?: boolean;
    api: CustomizePanelActionApi;
    ariaLabelledBy?: string;
}) => React.JSX.Element;
