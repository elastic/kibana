import type { GridPanelData } from '../grid_panel';
export interface GridSectionData {
    id: string;
    row: number;
    title: string;
    isCollapsed: boolean;
    panels: {
        [key: string]: GridPanelData;
    };
}
export interface ActiveSectionEvent {
    id: string;
    targetSection?: string;
    sensorType: 'mouse' | 'touch' | 'keyboard';
    startingPosition: {
        top: number;
        left: number;
    };
    translate: {
        top: number;
        left: number;
    };
}
/**
 * MainSections are rendered without headers, which means they are non-collapsible and don't have
 * titles; these are "runtime" sections that do not get translated to the output GridLayoutData, since
 * all "widgets" of type `panel` get sent into these "fake" sections
 */
export type MainSection = Omit<GridSectionData, 'row' | 'isCollapsed' | 'title'> & {
    order: number;
    isMainSection: true;
};
/**
 * Collapsible sections correspond to the `section` widget type in `GridLayoutData` - they are
 * collapsible, have titles, can be re-ordered, etc.
 */
export type CollapsibleSection = Omit<GridSectionData, 'row'> & {
    order: number;
    isMainSection: false;
};
