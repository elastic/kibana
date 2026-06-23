import type { ReactNode } from 'react';
/** @public */
export type SideNavItemActionMenuContext = Record<string, string>;
/** @public */
export interface SideNavItemActionMenuRenderProps {
    context: SideNavItemActionMenuContext;
    onClose: () => void;
}
/** @public */
export type SideNavItemActionMenuRenderer = (props: SideNavItemActionMenuRenderProps) => ReactNode;
/** @public */
export declare const registerSideNavItemActionMenuRenderer: (menuId: string, renderer: SideNavItemActionMenuRenderer) => void;
/** @public */
export declare const getSideNavItemActionMenuRenderer: (menuId: string) => SideNavItemActionMenuRenderer | undefined;
/** @public */
export declare const renderSideNavItemActionMenu: (menuId: string, props: SideNavItemActionMenuRenderProps) => ReactNode;
/** @internal */
export declare const subscribeSideNavItemActionMenuRenderers: (listener: () => void) => (() => void);
