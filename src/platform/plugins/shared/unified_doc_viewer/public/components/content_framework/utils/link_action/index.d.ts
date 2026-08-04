import type { MouseEventHandler } from 'react';
interface LinkActionProps {
    href?: string;
    onClick?: () => void;
}
/**
 * Creates `href` and `onClick` props that preserve native link behavior for
 * right-clicks and modifier-clicks, while allowing a handler to run on plain
 * left-click (preventing navigation when `href` is present).
 */
export declare function getLinkActionProps({ href, onClick }: LinkActionProps): {
    href?: string;
    onClick?: MouseEventHandler;
};
export {};
