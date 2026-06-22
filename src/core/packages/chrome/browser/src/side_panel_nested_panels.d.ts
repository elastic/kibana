import type { ReactNode } from 'react';
/** @public */
export interface SidePanelNestedPanelItemClickParams {
    href: string;
    id: string;
    label: string;
    panelId?: string;
}
/** @public */
export interface SidePanelNestedPanelRenderProps {
    onItemClick: (item: SidePanelNestedPanelItemClickParams) => void;
    onGoBack?: () => void;
}
/** @public */
export type SidePanelNestedPanelRenderer = (props: SidePanelNestedPanelRenderProps) => ReactNode;
/** @public */
export declare const registerSidePanelNestedPanelRenderer: (panelId: string, renderer: SidePanelNestedPanelRenderer) => void;
/** @public */
export declare const getSidePanelNestedPanelRenderer: (panelId: string) => SidePanelNestedPanelRenderer | undefined;
/** @public */
export declare const renderSidePanelNestedPanel: (panelId: string, props: SidePanelNestedPanelRenderProps) => ReactNode;
/** @internal */
export declare const subscribeSidePanelNestedPanelRenderers: (listener: () => void) => (() => void);
