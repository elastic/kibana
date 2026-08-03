/**
 * Shared EUI flyout history key for the Document Viewer flyout and any nested flyouts
 * (e.g. Trace Waterfall). Using the same key groups them into a single back-button
 * navigation history, enabling "Back" to return from a nested flyout to the Document Viewer.
 *
 * This is used by the unified-doc-viewer and security_solution plugins.
 */
export declare const DOC_VIEWER_FLYOUT_HISTORY_KEY: unique symbol;
