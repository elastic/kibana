export declare class FilterConversionError extends Error {
    readonly originalFilter?: unknown | undefined;
    constructor(message: string, originalFilter?: unknown | undefined);
}
