import type { FC, ReactNode } from 'react';
export interface SidebarBodyProps {
    children: ReactNode;
    /** Makes the body keyboard-scrollable with `tabIndex={0}` and announces it as a region. Defaults to false. */
    scrollable?: boolean;
}
/** Body component for sidebar apps */
export declare const SidebarBody: FC<SidebarBodyProps>;
