import type { FormHook, FieldHook, FieldConfig, FormData, FieldValidationData } from '../types';
export interface InternalFieldConfig<T> {
    initialValue: T;
    isIncludedInOutput?: boolean;
}
export declare const useField: <T, FormType = FormData, I = T>(form: FormHook<FormType>, path: string, config: FieldConfig<T, FormType, I> & InternalFieldConfig<T>, valueChangeListener?: (value: I) => void, errorChangeListener?: (errors: string[] | null) => void, { validationData, validationDataProvider, }?: FieldValidationData) => FieldHook<T, I>;
