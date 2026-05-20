interface GridCoordinate {
    column: number;
    row: number;
}
interface GridRect extends GridCoordinate {
    width: number;
    height: number;
}
export interface GridPanelData extends GridRect {
    id: string;
    resizeOptions?: {
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
    };
}
export interface ActivePanelEvent {
    /**
     * The type of interaction being performed.
     */
    type: 'drag' | 'resize';
    /**
     * The id of the panel being interacted with.
     */
    id: string;
    /**
     * The index of the grid row this panel interaction is targeting.
     */
    targetSection: string;
    /**
     * The pixel rect of the panel being interacted with.
     */
    panelDiv: HTMLDivElement;
    /**
     * The pixel offsets from where the mouse was at drag start to the
     * edges of the panel
     */
    sensorOffsets: {
        top: number;
        left: number;
        right: number;
        bottom: number;
    };
    sensorType: 'mouse' | 'touch' | 'keyboard';
    /**
     * This position of the fixed position panel
     */
    position: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
}
export {};
