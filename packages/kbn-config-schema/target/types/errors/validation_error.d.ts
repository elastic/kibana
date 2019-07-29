import { SchemaError, SchemaTypeError } from '.';
export declare class ValidationError extends SchemaError {
    static extractMessage(error: SchemaTypeError, namespace?: string): string;
    constructor(error: SchemaTypeError, namespace?: string);
}
//# sourceMappingURL=validation_error.d.ts.map