type GetValuesTypes<T> = T extends Record<PropertyKey, any> ? {
    [K in keyof T]: GetValuesTypes<T[K]>;
}[keyof T] : T;
/**
 * Returns a flattened version of the input object also accounting for nested properties.
 * @param obj - The input object.
 * @param parentKey - The initial key used for recursive flattening.
 * @returns An object containing all the flattened properties.
 */
export declare function flattenObject<TObj extends Record<PropertyKey, any>>(obj: TObj, parentKey?: string): Record<PropertyKey, GetValuesTypes<TObj>>;
/**
 * Returns a flattened version of the input object, giving higher priority to nested fields and flattening them after the other properties.
 * @param obj - The input object.
 * @returns An object containing all the flattened properties.
 */
export declare function flattenObjectNestedLast<TObj extends Record<PropertyKey, any>>(obj: TObj): {
    [x: string]: GetValuesTypes<TObj> | GetValuesTypes<GetValuesTypes<TObj>>;
    [x: number]: GetValuesTypes<TObj> | GetValuesTypes<GetValuesTypes<TObj>>;
    [x: symbol]: GetValuesTypes<TObj> | GetValuesTypes<GetValuesTypes<TObj>>;
};
export {};
