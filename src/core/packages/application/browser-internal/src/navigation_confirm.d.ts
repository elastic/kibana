import type { OverlayStart } from '@kbn/core-overlays-browser';
export type ConfirmHandlerCallback = (result: boolean) => void;
export type ConfirmHandler = (message: string, callback: ConfirmHandlerCallback) => void;
interface GetUserConfirmationHandlerParams {
    overlayPromise: Promise<OverlayStart>;
    fallbackHandler?: ConfirmHandler;
}
export declare const getUserConfirmationHandler: ({ overlayPromise, fallbackHandler, }: GetUserConfirmationHandlerParams) => ConfirmHandler;
export {};
