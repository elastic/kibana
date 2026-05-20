import type { FormHook, FormData, FormConfig } from '../types';
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export interface UseFormReturn<T extends FormData, I extends FormData> {
    form: FormHook<T, I>;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare function useForm<T extends FormData = FormData, I extends FormData = T>(formConfig?: FormConfig<T, I>): UseFormReturn<T, I>;
