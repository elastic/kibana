import type { FC, ReactNode } from 'react';
export interface SidebarPanelProps {
    children: ReactNode;
}
/**
 * Minimal container for sidebar app content.
 * Apps are responsible for rendering their own header using SidebarHeader component.
 *
 * Provides {@link SidebarPanelContext} so child components can access
 * the panel's heading ID for aria-labelledby via {@link useSidebarPanel}.
 */
export declare const SidebarPanel: FC<SidebarPanelProps>;
