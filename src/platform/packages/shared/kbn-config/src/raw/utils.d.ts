export declare const splitKey: (rawKey: string) => string[];
export declare const getUnsplittableKey: (rawKey: string) => string | undefined;
export declare function replaceEnvVarRefs(val: string, env?: {
    [key: string]: string | undefined;
}): string;
