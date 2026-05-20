import React, { type HTMLAttributes } from 'react';
import type { TabsServices } from '../../types';
export interface TabWithBackgroundProps extends HTMLAttributes<HTMLElement> {
    isSelected: boolean;
    isDragging?: boolean;
    hideRightSeparator?: boolean;
    services: TabsServices;
    children: React.ReactNode;
}
export declare const TabWithBackground: React.ForwardRefExoticComponent<TabWithBackgroundProps & React.RefAttributes<HTMLDivElement>>;
