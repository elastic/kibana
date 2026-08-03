import type { FormHook, FieldConfig } from '../types';
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export interface Props {
    path: string;
    initialNumberOfItems?: number;
    readDefaultValueOnForm?: boolean;
    validations?: FieldConfig<ArrayItem[]>['validations'];
    children: (formFieldArray: FormArrayField) => JSX.Element;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export interface ArrayItem {
    id: number;
    path: string;
    isNew: boolean;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export interface FormArrayField {
    items: ArrayItem[];
    error: string | null;
    addItem: () => void;
    removeItem: (id: number) => void;
    moveItem: (sourceIdx: number, destinationIdx: number) => void;
    form: FormHook;
}
/**
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const createArrayItem: (path: string, index: number, isNew?: boolean) => ArrayItem;
/**
 * We create an internal field to represent the Array items. This field is not returned
 * as part as the form data but is used internally to run validation on the array items.
 * It is this internal field value (ArrayItem[]) that we then map to actual form fields
 * (in the children func <UseArray>{({ items }) => (...)}</UseArray>)
 *
 * @param path The array path in the form data
 * @returns The internal array field path
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 */
export declare const getInternalArrayFieldPath: (path: string) => string;
/**
 * Use UseArray to dynamically add fields to your form.
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 *
 * example:
 * If your form data looks like this:
 *
 * {
 *   users: []
 * }
 *
 * and you want to be able to add user objects (e.g. { name: 'john', lastName. 'snow' }) inside
 * the "users" array, you would use UseArray to render rows of user objects with 2 fields in each of them ("name" and "lastName")
 *
 * Look at the README.md for some examples.
 */
export declare const UseArray: ({ path, initialNumberOfItems, validations, readDefaultValueOnForm, children, }: Props) => JSX.Element;
