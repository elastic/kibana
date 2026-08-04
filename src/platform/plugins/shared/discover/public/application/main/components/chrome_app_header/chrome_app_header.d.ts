import type { ReactNode } from 'react';
import React from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
interface ChromeAppHeaderProps {
    menu?: AppMenuConfig;
    tabsBar?: ReactNode;
}
export declare const ChromeAppHeader: ({ menu, tabsBar }: ChromeAppHeaderProps) => React.JSX.Element | null;
export {};
