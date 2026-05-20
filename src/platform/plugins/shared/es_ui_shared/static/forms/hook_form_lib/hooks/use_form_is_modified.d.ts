import type { FormHook } from '../types';
interface Options {
    form?: FormHook<any>;
    /**
     * List of field paths to discard when checking if a field has been modified.
     * Useful when we add internal fields (e.g. toggles) to the form that should not
     * have an impact on the "isModified" state.
     */
    discard?: string[];
}
/**
 * Hook to detect if any of the form fields have been modified by the user.
 * If a field is modified and then the value is changed back to the initial value
 * the form **won't be marked as modified**.
 * This is useful to detect if a form has changed and we need to display a confirm modal
 * to the user before they navigate away and lose their changes.
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 *
 * @param options - Optional options object
 * @returns flag to indicate if the form has been modified
 */
export declare const useFormIsModified: ({ form: formFromOptions, discard: fieldPathsToDiscard, }?: Options) => boolean;
export {};
