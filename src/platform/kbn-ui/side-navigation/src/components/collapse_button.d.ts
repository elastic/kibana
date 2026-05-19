import type { FC } from 'react';
interface Props {
    isCollapsed: boolean;
    toggle: (isCollapsed: boolean) => void;
}
/**
 * Collapse button for the side navigation
 */
export declare const SideNavCollapseButton: FC<Props>;
export {};
