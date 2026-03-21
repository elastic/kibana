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
export type HookReturn<I extends object = FormData, T extends object = I> = [I, () => T, boolean];
export declare const useFormData: <I extends object = FormData, T extends object = I>(options?: Options<I>) => HookReturn<I, T>;
export {};
