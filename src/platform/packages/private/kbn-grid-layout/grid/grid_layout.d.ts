import React from 'react';
import type { GridAccessMode, GridLayoutData, GridSettings, UseCustomDragHandle } from './types';
export type GridLayoutProps = {
    layout: GridLayoutData;
    gridSettings: GridSettings;
    onLayoutChange: (newLayout: GridLayoutData) => void;
    expandedPanelId?: string;
    accessMode?: GridAccessMode;
    className?: string;
} & UseCustomDragHandle;
export declare const GridLayout: ({ layout, gridSettings, renderPanelContents, onLayoutChange, expandedPanelId, accessMode, className, useCustomDragHandle, }: GridLayoutProps) => React.JSX.Element;
