export declare class SchemaError extends Error {
    cause?: Error;
    constructor(message: string, cause?: Error);
}
