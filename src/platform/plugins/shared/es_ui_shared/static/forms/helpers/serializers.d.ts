import type { SerializerFunc } from '../hook_form_lib';
export declare const multiSelectComponent: Record<string, SerializerFunc<string[]>>;
interface StripEmptyFieldsOptions {
    types?: Array<'string' | 'object'>;
    recursive?: boolean;
}
/**
 * Strip empty fields from a data object.
 * Empty fields can either be an empty string (one or several blank spaces) or an empty object (no keys)
 *
 * @param object Object to remove the empty fields from.
 * @param types An array of types to strip. Types can be "string" or "object". Defaults to ["string", "object"]
 * @param options An optional configuration object. By default recursive it turned on.
 */
export declare const stripEmptyFields: (object?: {
    [key: string]: any;
}, options?: StripEmptyFieldsOptions) => {
    [key: string]: any;
};
export {};
