/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const FIELD_TYPES: {
    TEXT: string;
    TEXTAREA: string;
    NUMBER: string;
    TOGGLE: string;
    CHECKBOX: string;
    COMBO_BOX: string;
    RADIO_GROUP: string;
    RANGE: string;
    SELECT: string;
    SUPER_SELECT: string;
    MULTI_SELECT: string;
    JSON: string;
    BUTTON_GROUP: string;
    MULTI_BUTTON_GROUP: string;
    DATE_PICKER: string;
    PASSWORD: string;
    HIDDEN: string;
};
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const VALIDATION_TYPES: {
    /** Default validation error (on the field value) */
    FIELD: string;
    /** Returned from asynchronous validations */
    ASYNC: string;
    /** If the field value is an Array, this error type would be returned if an _item_ of the array is invalid */
    ARRAY_ITEM: string;
};
