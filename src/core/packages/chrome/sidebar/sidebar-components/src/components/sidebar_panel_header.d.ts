import type { FC, ReactNode } from 'react';
export interface SidebarHeaderProps {
    /** Renders as heading and labels the panel via aria-labelledby. When children are provided, used only for the aria-label. */
    title: string;
    /** Custom header content. Overrides title rendering; title still labels the panel. */
    children?: ReactNode;
    /** Close handler (renders close button when provided) */
    onClose?: () => void;
    /** Action buttons before close button */
    actions?: ReactNode;
}
/** Header component for sidebar apps */
export declare const SidebarHeader: FC<SidebarHeaderProps>;
