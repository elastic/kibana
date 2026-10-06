import React from 'react';
import type { CoreStart } from '@kbn/core/public';
interface LoadContentArgs {
    closeModal: () => void;
}
interface OpenLazyModalParams {
    core: CoreStart;
    loadContent: (args: LoadContentArgs) => Promise<React.JSX.Element | null | void>;
    onClose?: () => void;
    ariaLabelledBy: string;
}
/**
 * Opens a modal with lazily loaded content.
 *
 * This helper handles:
 * - Mounting a modal with async content.
 * - Showing a loading skeleton while content is being loaded.
 * - Closing the modal automatically if content resolves to `null` or `undefined`.
 *
 * @param params - Configuration object.
 * @param params.core - The `CoreStart` contract, used for rendering context.
 * @param params.loadContent - Async function that loads the modal content. Must return a valid React element.
 *                             If it resolves to `null` or `undefined`, the modal will close automatically.
 * @param params.onClose - Optional callback invoked when the modal is closed.
 * @param params.ariaLabelledBy - The `id` of the element that labels the modal, forwarded to `EuiModal`'s
 *                                `aria-labelledby` prop. Should reference the modal's visible title element
 *                                so screen readers can announce the modal name correctly.
 */
export declare const openLazyModal: ({ core, loadContent, onClose: onCloseCallback, ariaLabelledBy, }: OpenLazyModalParams) => void;
export {};
