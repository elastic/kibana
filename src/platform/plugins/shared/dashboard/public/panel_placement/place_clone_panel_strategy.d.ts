import type { PanelPlacementProps, PanelPlacementReturn } from './types';
export declare function placeClonePanel({ width, height, sectionId, currentPanels, placeBesideId, }: PanelPlacementProps & {
    placeBesideId: string;
}): PanelPlacementReturn;
