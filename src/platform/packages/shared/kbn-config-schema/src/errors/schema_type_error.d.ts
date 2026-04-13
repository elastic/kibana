import { SchemaError } from '.';
export declare class SchemaTypeError extends SchemaError {
    readonly path: string[];
    constructor(error: Error | string, path: string[]);
}
