import React, { type ReactNode } from 'react';
import type { SidebarStart } from '@kbn/core-chrome-sidebar-types';
interface SidebarContextValue {
    sidebar: SidebarStart;
}
export interface SidebarProviderProps {
    children: ReactNode;
    value: SidebarContextValue;
}
export declare function SidebarServiceProvider({ children, value }: SidebarProviderProps): React.JSX.Element;
/**
 * @internal
 */
export declare function useSidebarService(): SidebarStart;
export {};
