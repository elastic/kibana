import type { FC, ReactNode } from 'react';
export interface PanelIds {
    panelNavigationInstructionsId: string;
    panelEnterSubmenuInstructionsId: string;
}
export type PanelChildren = ReactNode | ((ids: PanelIds) => ReactNode);
export interface PanelProps {
    children: PanelChildren;
    id: string;
    title?: string;
}
export declare const Panel: FC<PanelProps>;
