import React from 'react';
import type { TabPreviewData, TabItem } from '../../types';
export interface TabPreviewProps {
    children: React.ReactNode;
    showPreview: boolean;
    setShowPreview: (show: boolean) => void;
    tabItem: TabItem;
    previewData: TabPreviewData;
    stopPreviewOnHover?: boolean;
    previewDelay?: number;
    position?: 'bottom' | 'left';
}
export declare const TabPreview: React.FC<TabPreviewProps>;
