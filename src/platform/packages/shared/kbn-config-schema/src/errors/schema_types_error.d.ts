import { SchemaTypeError } from '.';
export declare class SchemaTypesError extends SchemaTypeError {
    readonly errors: SchemaTypeError[];
    constructor(error: Error | string, path: string[], errors: SchemaTypeError[]);
}
