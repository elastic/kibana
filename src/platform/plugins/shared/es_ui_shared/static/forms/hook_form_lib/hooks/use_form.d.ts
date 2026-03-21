import type { FormHook, FormData, FormConfig } from '../types';
export interface UseFormReturn<T extends FormData, I extends FormData> {
    form: FormHook<T, I>;
}
export declare function useForm<T extends FormData = FormData, I extends FormData = T>(formConfig?: FormConfig<T, I>): UseFormReturn<T, I>;
