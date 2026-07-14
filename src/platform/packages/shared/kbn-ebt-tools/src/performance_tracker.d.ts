import type { Logger } from '@kbn/logging';
/**
 * PERFORMANCE_TRACKER_TYPES defines top-level categories to be used as
 * the mark name. They are used to group marks and measures by type.
 */
export declare const PERFORMANCE_TRACKER_TYPES: {
    readonly PANEL: "Panel";
};
export type PerformanceTrackerTypes = (typeof PERFORMANCE_TRACKER_TYPES)[keyof typeof PERFORMANCE_TRACKER_TYPES];
/**
 * PerformanceTrackerMarks are the marks that can be used to track performance
 * of lens charts. They are used to mark specific points in time during
 * the chart's lifecycle.
 */
export declare const PERFORMANCE_TRACKER_MARKS: {
    /**
     * Mark that indicates the start of everything before the rendering process.
     */
    readonly PRE_RENDER: "preRender";
    /**
     * Mark that indicates the start of the rendering process.
     * Should be used right before returning the chart's JSX.
     */
    readonly RENDER_START: "renderStart";
    /**
     * Mark that indicates the end of the rendering process.
     * Should be used at the beginning of the `renderComplete` callback.
     */
    readonly RENDER_COMPLETE: "renderComplete";
};
export type PerformanceTrackerMarks = (typeof PERFORMANCE_TRACKER_MARKS)[keyof typeof PERFORMANCE_TRACKER_MARKS];
export declare const PERFORMANCE_TRACKER_MEASURES: {
    readonly PRE_RENDER_DURATION: "preRenderDuration";
    readonly RENDER_DURATION: "renderDuration";
};
export type PerformanceTrackerMeasures = (typeof PERFORMANCE_TRACKER_MEASURES)[keyof typeof PERFORMANCE_TRACKER_MEASURES];
/**
 * Options to create a performance tracker.
 */
interface PerformanceTrackerOptions {
    /**
     * High-level type of the performance tracker, for example "Panel".
     */
    type: PerformanceTrackerTypes;
    /**
     * Lower-level type of the performance tracker type, for example "xyVis".
     * This is used to group marks and measures by sub type.
     */
    subType: string;
    /**
     * Optional logger.
     */
    logger?: Logger;
}
/**
 * Creates a performance tracker to mark and measure performance events.
 * @param options.type - High-level type of the performance tracker, for example "Panel".
 * @param options.subType - Lower-level type of the performance tracker type, for example "xyVis".
 * @returns A performance tracker object with a mark method.
 */
export declare const createPerformanceTracker: ({ type, subType, logger }: PerformanceTrackerOptions) => {
    /**
     * Creates a performance mark with the given name.
     * @param name - The name of the mark to create, will be postfixed.
     * @returns The created performance mark
     */
    mark: (name: PerformanceTrackerMarks) => void;
};
/**
 * Finds a performance marker by its name postfix.
 * @param markers
 * @param namePostfix
 * @returns The found performance marker or undefined if not found.
 */
export declare const findMarkerByNamePostfix: (markers: PerformanceMark[], namePostfix: PerformanceTrackerMarks) => PerformanceMark | undefined;
/**
 * Get all performance trackers by type.
 * @param type - High-level type of the performance tracker, for example "Panel".
 * @returns An array of performance trackers.
 */
export declare const getPerformanceTrackersByType: (type: PerformanceTrackerTypes) => PerformanceMark[];
/**
 * Get all performance trackers grouped by id.
 * @param type - High-level type of the performance tracker, for example "Panel".
 * @returns A map of performance trackers grouped by id.
 */
export declare const getPerformanceTrackersGroupedById: (type: PerformanceTrackerTypes) => import("lodash").Dictionary<PerformanceMark[]>;
/**
 * Clear all performance trackers by type.
 * @param type - High-level type of the performance tracker, for example "Panel".
 */
export declare const clearPerformanceTrackersByType: (type: PerformanceTrackerTypes) => void;
interface GetMeanFromMeasuresOptions {
    type: PerformanceTrackerTypes;
    startMark: PerformanceTrackerMarks;
    endMark: PerformanceTrackerMarks;
    createPerformanceMeasures?: boolean;
}
/**
 * Get the mean duration of performance measures between two marks.
 * @param type
 * @param startMark
 * @param endMark
 * @param createPerformanceMeasures - Whether to create performance measures.
 * @returns The mean duration of the performance measures between the two marks.
 */
export declare const getMeanFromPerformanceMeasures: ({ type, startMark, endMark, createPerformanceMeasures, }: GetMeanFromMeasuresOptions) => number;
export {};
