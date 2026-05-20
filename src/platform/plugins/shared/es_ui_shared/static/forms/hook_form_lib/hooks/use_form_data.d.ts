import type { FormData, FormHook } from '../types';
interface Options<I> {
    watch?: string | string[];
    form?: FormHook<any>;
    /**
     * Use this handler if you want to listen to field values changes immediately
     * (**before** the validations are ran) instead of relying on a useEffect()
     */
    onChange?: (formData: I) => void;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export type HookReturn<I extends object = FormData, T extends object = I> = [I, () => T, boolean];
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const useFormData: <I extends object = FormData, T extends object = I>(options?: Options<I>) => HookReturn<I, T>;
export {};
