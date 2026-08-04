/**
 * Provides the EUI flyout `historyKey` symbol shared between the Document Viewer
 * flyout and any nested flyouts (e.g. Trace Waterfall) that should participate
 * in the same back-button navigation history group.
 *
 * The context is provided by `UnifiedDocViewerFlyout` and consumed by
 * `FullScreenWaterfall` so that the two flyouts share a history stack,
 * enabling the "Back" button on the Trace Waterfall to return the user to
 * the Document Viewer.
 */
export declare const FlyoutHistoryKeyContext: import("react").Context<symbol | undefined>;
export declare const useFlyoutHistoryKey: () => symbol | undefined;
