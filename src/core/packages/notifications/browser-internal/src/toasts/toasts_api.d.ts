import * as Rx from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ErrorToastOptions, IToasts, Toast, ToastInput, ToastOptions } from '@kbn/core-notifications-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
interface StartDeps {
    overlays: OverlayStart;
    rendering: RenderingService;
}
/**
 * Methods for adding and removing global toast messages.
 * @public
 */
export declare class ToastsApi implements IToasts {
    private toasts$;
    private idCounter;
    private uiSettings;
    private startDeps?;
    constructor(deps: {
        uiSettings: IUiSettingsClient;
    });
    /** @internal */
    start(startDeps: StartDeps): void;
    /** Observable of the toast messages queued to be shown to the user. */
    get$(): Rx.Observable<Toast[]>;
    /**
     * Adds a new toast to current array of toast.
     *
     * @param toastOrTitle - a {@link ToastInput}
     * @returns a {@link Toast}
     */
    add(toastOrTitle: ToastInput): Toast;
    /**
     * Removes a toast from the current array of toasts if present.
     * @param toastOrId - a {@link Toast} returned by {@link ToastsApi.add} or its id
     */
    remove(toastOrId: Toast | string): void;
    /**
     * Adds a new toast pre-configured with the info color and info icon.
     *
     * @param toastOrTitle - a {@link ToastInput}
     * @param options - a {@link ToastOptions}
     * @returns a {@link Toast}
     */
    addInfo(toastOrTitle: ToastInput, options?: ToastOptions): Toast;
    /**
     * Adds a new toast pre-configured with the success color and check icon.
     *
     * @param toastOrTitle - a {@link ToastInput}
     * @param options - a {@link ToastOptions}
     * @returns a {@link Toast}
     */
    addSuccess(toastOrTitle: ToastInput, options?: ToastOptions): Toast;
    /**
     * Adds a new toast pre-configured with the warning color and help icon.
     *
     * @param toastOrTitle - a {@link ToastInput}
     * @param options - a {@link ToastOptions}
     * @returns a {@link Toast}
     */
    addWarning(toastOrTitle: ToastInput, options?: ToastOptions): Toast;
    /**
     * Adds a new toast pre-configured with the danger color and alert icon.
     *
     * @param toastOrTitle - a {@link ToastInput}
     * @param options - a {@link ToastOptions}
     * @returns a {@link Toast}
     */
    addDanger(toastOrTitle: ToastInput, options?: ToastOptions): Toast;
    /**
     * Adds a new toast that displays an exception message with a button to open the full stacktrace in a modal.
     *
     * @param error - an `Error` instance.
     * @param options - {@link ErrorToastOptions}
     * @returns a {@link Toast}
     */
    addError(error: Error, options: ErrorToastOptions): Toast;
    private openModal;
}
export {};
