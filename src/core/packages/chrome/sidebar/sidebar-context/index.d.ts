import React, { type ReactNode } from 'react';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
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
/** Context for the sidebar panel, shared with consumer components */
export interface SidebarPanelContextValue {
    /** ID to place on the panel's heading element for aria-labelledby */
    headingId: string;
    /** Override focus target when the panel unmounts with focus inside. Defaults to main content. */
    setOnFocusRescue: (callback: (() => void) | undefined) => void;
}
export declare const SidebarPanelContext: React.Context<SidebarPanelContextValue | null>;
/** Hook for consumer components to access the sidebar panel context. Throws outside SidebarPanel. */
export declare const useSidebarPanel: () => SidebarPanelContextValue;
export {};
