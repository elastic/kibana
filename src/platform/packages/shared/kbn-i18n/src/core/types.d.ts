export type FormatXMLElementFn<T, R = string | T | Array<string | T>> = (parts: Array<string | T>) => R;
export type PrimitiveType = string | number | boolean | null | undefined | Date;
