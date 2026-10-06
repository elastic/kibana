export interface LIMITS {
    paddingsWidth: number;
    minWidth?: number;
    avCharWidth: number;
    maxWidth: number;
}
export declare const MAX_WIDTH = 550;
export declare function calculateWidthFromCharCount(labelLength: number, overridesPanelWidths?: Partial<LIMITS>): number;
