import type { HTMLAttributes } from 'react';
import React from 'react';
import type { TabsServices } from '../../types';
export interface TabsBarWithBackgroundProps extends HTMLAttributes<HTMLElement> {
    services: TabsServices;
    children: React.ReactNode;
}
export declare const TabsBarWithBackground: React.FC<TabsBarWithBackgroundProps>;
