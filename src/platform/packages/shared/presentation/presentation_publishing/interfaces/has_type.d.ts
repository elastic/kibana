export interface HasType<T extends string = string> {
    type: T;
}
export interface HasTypeDisplayName {
    getTypeDisplayName: () => string;
    getTypeDisplayNameLowerCase?: () => string;
}
export declare const apiHasType: (api: unknown | null) => api is HasType;
export declare const apiIsOfType: <T extends string = string>(api: unknown | null, typeToCheck: T) => api is HasType<T>;
