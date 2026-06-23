import type { SchemaTypeError } from '.';
import { SchemaError } from '.';
export declare class ValidationError extends SchemaError {
    private static extractMessage;
    constructor(error: SchemaTypeError, namespace?: string);
}
