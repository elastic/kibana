/**
 * `Performance.memory` output.
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface BrowserPerformanceMemoryInfo {
    /**
     * The maximum size of the heap, in bytes, that is available to the context.
     */
    jsHeapSizeLimit: number;
    /**
     * The total allocated heap size, in bytes.
     */
    totalJSHeapSize: number;
    /**
     * The currently active segment of JS heap, in bytes.
     */
    usedJSHeapSize: number;
}
/**
 * Get performance information from the browser (non-standard property).
 * @remarks Only available in Google Chrome and MS Edge for now.
 */
export declare function fetchOptionalMemoryInfo(): BrowserPerformanceMemoryInfo | undefined;
