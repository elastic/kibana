import type { FieldHook } from './types';
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const getFieldValidityAndErrorMessage: (field: {
    isChangingValue: FieldHook["isChangingValue"];
    errors: FieldHook["errors"];
}) => {
    isInvalid: boolean;
    errorMessage: string | null;
};
