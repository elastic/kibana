import type { FieldHook } from '../types';
interface GenericObject {
    [key: string]: any;
}
export declare const unflattenObject: <T extends object = GenericObject>(object: object) => T;
export declare const flattenObject: (obj: GenericObject, prefix?: string[], isArrayItem?: boolean) => GenericObject;
/**
 * Deeply remove all "undefined" value inside an Object
 *
 * @param obj The object to process
 * @returns The object without any "undefined"
 */
export declare const stripOutUndefinedValues: <R>(obj: GenericObject) => R;
/**
 * Helper to map the object of fields to any of its value
 *
 * @param formFields key value pair of path and form Fields
 * @param fn Iterator function to execute on the field
 */
export declare const mapFormFields: (formFields: Record<string, FieldHook>, fn: (field: FieldHook) => any) => Record<string, unknown>;
export {};
