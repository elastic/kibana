import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
interface LoadContentArgs {
    closeFlyout: () => void;
    ariaLabelledBy: string;
}
interface OpenLazyFlyoutParams {
    core: CoreStart;
    parentApi?: unknown;
    loadContent: (args: LoadContentArgs) => Promise<JSX.Element | null | void>;
    flyoutProps?: Partial<OverlayFlyoutOpenOptions> & {
        triggerId?: string;
        focusedPanelId?: string;
    };
}
/**
 * Opens a flyout panel with lazily loaded content.
 *
 * This helper handles:
 * - Mounting a flyout panel with async content.
 * - Automatically focusing the flyout when content is ready.
 * - Tracking the flyout if `parentApi` supports overlay tracking.
 * - Returning focus to a trigger element when the flyout closes.
 *
 * @param params - Configuration object.
 * @param params.core - The `CoreStart` contract, used for overlays and notifications.
 * @param params.loadContent - Async function that loads the flyout content. Must return a valid React element.
 *                             If it resolves to `null` or `undefined`, the flyout will close automatically.
 * @param params.flyoutProps - Optional props passed to `openFlyout` (e.g. size, className, etc).
 *                             Supports `OverlayFlyoutOpenOptions`.
 * @param params.parentApi - Optional parent API to track opened overlays (e.g. dashboardsApi).
 *
 * @returns A handle to the opened flyout (`OverlayRef`).
 */
export declare const openLazyFlyout: (params: OpenLazyFlyoutParams) => import("@kbn/core/public").OverlayRef;
export {};
