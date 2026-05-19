import type { HTMLAttributes } from 'react';
import type { SideNavLogo } from '../../../types';
export interface LogoProps extends Omit<HTMLAttributes<HTMLAnchorElement>, 'onClick'>, SideNavLogo {
    id: string;
    isCollapsed: boolean;
    isCurrent?: boolean;
    isHighlighted: boolean;
    onClick?: () => void;
}
export declare const Logo: ({ isCollapsed, isCurrent, isHighlighted, label, ...props }: LogoProps) => JSX.Element;
