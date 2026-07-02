import type { GridPanelData } from '../grid_panel';
import type { GridSectionData } from '../grid_section';
import type { GridLayoutData, OrderedLayout } from '../types';
export declare const getLayoutInOrder: (layout: GridLayoutData, draggedId?: string) => Array<{
    type: "panel" | "section";
    id: string;
}>;
export declare const getPanelKeysInOrder: (panels: GridSectionData["panels"], draggedId?: string) => string[];
export declare const getSectionsInOrder: (layout: OrderedLayout) => (import("../grid_section").MainSection | import("../grid_section").CollapsibleSection)[];
export declare const resolveGridSection: (originalSectionData: GridSectionData["panels"], dragRequest?: GridPanelData) => GridSectionData["panels"];
