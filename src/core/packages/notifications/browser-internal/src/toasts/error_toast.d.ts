import React from 'react';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
interface ErrorToastProps {
    title: string;
    error: Error;
    toastMessage: string;
    openModal: OverlayStart['openModal'];
    rendering: RenderingService;
}
/**
 * This should instead be replaced by the overlay service once it's available.
 * This does not use React portals so that if the parent toast times out, this modal
 * does not disappear. NOTE: this should use a global modal in the overlay service
 * in the future.
 */
export declare function showErrorDialog({ title, error, openModal, rendering, }: Pick<ErrorToastProps, 'error' | 'title' | 'openModal' | 'rendering'>): void;
export declare function ErrorToast({ title, error, toastMessage, openModal, rendering }: ErrorToastProps): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
export {};
