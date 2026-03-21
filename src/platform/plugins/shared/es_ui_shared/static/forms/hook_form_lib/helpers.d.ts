import type { FieldHook } from './types';
export declare const getFieldValidityAndErrorMessage: (field: {
    isChangingValue: FieldHook["isChangingValue"];
    errors: FieldHook["errors"];
}) => {
    isInvalid: boolean;
    errorMessage: string | null;
};
