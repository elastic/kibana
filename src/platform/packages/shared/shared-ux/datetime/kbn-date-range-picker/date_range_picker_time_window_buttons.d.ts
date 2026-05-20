import React from 'react';
/** Configuration for time window buttons. */
export interface TimeWindowButtonsConfig {
    /**
     * How much the time window is increased/decreased when zooming.
     * A number between 0 and 1, or a percentage string e.g. "25%".
     * @default 0.5
     */
    zoomFactor?: number | string;
    /**
     * Show buttons for shifting the time window forward and backward.
     * @default true
     */
    showShiftArrows?: boolean;
    /**
     * Show the "zoom out" button.
     * @default true
     */
    showZoomOut?: boolean;
    /**
     * Show the "zoom in" button.
     * @default false
     */
    showZoomIn?: boolean;
}
export declare const DEFAULT_ZOOM_FACTOR = 0.5;
/** Minimum zoom delta (ms) used when the window is zero-width. */
export declare const ZOOM_DELTA_FALLBACK_MS = 500;
/**
 * Time window control buttons rendered beside the DateRangePicker control.
 * Provides step forward/backward and zoom out/in actions.
 */
export declare function TimeWindowButtons({ config }: {
    config: TimeWindowButtonsConfig;
}): React.JSX.Element | null;
