import type { IToasts } from '@kbn/core-notifications-browser';
interface SetInitialValueParams {
    /** The text value that is initially in the console editor. */
    localStorageValue?: string;
    /** The function that sets the state of the value in the console editor. */
    setValue: (value: string) => void;
    /** The toasts service. */
    toasts: IToasts;
}
/**
 * Util function for reading the load_from parameter from the current url.
 */
export declare const readLoadFromParam: () => string;
/**
 * Hook that sets the initial value in the Console editor.
 *
 * @param params The {@link SetInitialValueParams} to use.
 */
export declare const useSetInitialValue: (params: SetInitialValueParams) => void;
export {};
